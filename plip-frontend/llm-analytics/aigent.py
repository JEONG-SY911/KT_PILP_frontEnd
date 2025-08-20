####### 여러분의 함수와 클래스를 모드 여기에 붙여 넣읍시다. #######
## 1. 라이브러리 로딩 ---------------------------------------------
import pandas as pd
import numpy as np
import os
import openai
import random
import ast
import fitz
from docx import Document

import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

from typing import Annotated, Literal, Sequence, TypedDict, List, Dict
from langchain import hub
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.output_parsers import CommaSeparatedListOutputParser
from langgraph.graph import StateGraph, END

## ---------------- 1단계 : 사전준비 ----------------------

# 1) 파일 입력 --------------------
def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        doc = fitz.open(file_path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    elif ext == ".docx":
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    else:
        raise ValueError("지원하지 않는 파일 형식입니다. PDF 또는 DOCX만 허용됩니다.")

# 2) State 선언 --------------------
class InterviewState(TypedDict):
    # 고정 정보
    resume_text: str
    resume_summary: str
    resume_keywords: List[str]
    question_strategy: Dict[str, Dict]

    # 인터뷰 로그
    current_question: str
    current_answer: str
    current_strategy: str
    conversation: List[Dict[str, str]]
    evaluation : List[Dict[str, str]]
    next_step : str

# 3) resume 분석 --------------------
def analyze_resume(state: InterviewState) -> InterviewState:
    resume_text = state.get("resume_text", "")
    if not resume_text:
        raise ValueError("resume_text가 비어 있습니다. 먼저 텍스트를 추출해야 합니다.")

    llm = ChatOpenAI(model="gpt-4o-mini")

    # 요약 프롬프트 구성
    summary_prompt = ChatPromptTemplate.from_template(
        '''당신은 이력서를 바탕으로 인터뷰 질문을 설계하는 AI입니다.
        다음 이력서 및 자기소개서 내용에서 질문을 뽑기 위한 중요한 내용을 10문장 정도로 요약을 해줘(요약시 ** 기호는 사용하지 말것):\n\n{resume_text}'''
    )
    formatted_summary_prompt = summary_prompt.format(resume_text=resume_text)
    summary_response = llm.invoke(formatted_summary_prompt)
    resume_summary = summary_response.content.strip()

    # 키워드 추출 프롬프트 구성
    keyword_prompt = ChatPromptTemplate.from_template(
        '''당신은 이력서를 바탕으로 인터뷰 질문을 설계하는 AI입니다.
        다음 이력서 및 자기소개서내용에서 질문을 뽑기 위한 중요한 핵심 키워드를 5~10개 추출해줘. 도출한 핵심 키워드만 쉼표로 구분해줘:\n\n{resume_text}'''
    )
    formatted_keyword_prompt = keyword_prompt.format(resume_text=resume_text)
    keyword_response = llm.invoke(formatted_keyword_prompt)

    parser = CommaSeparatedListOutputParser()
    resume_keywords = parser.parse(keyword_response.content)

    return {
        **state,
        "resume_summary": resume_summary,
        "resume_keywords": resume_keywords,
    }

# 4) 질문 전략 수립 --------------------

def generate_question_strategy(state: InterviewState) -> InterviewState:
    resume_summary = state.get("resume_summary", "")
    resume_keywords = ", ".join(state.get("resume_keywords", []))

    prompt = ChatPromptTemplate.from_template("""
당신은 이력서를 바탕으로 인터뷰 질문을 설계하는 AI입니다.
다음 이력서 요약과 키워드를 기반으로, 다음 3가지 질문 부문 별로 질문 방향과 예시 질문 2개를 딕셔너리 형태로 출력해줘.

- 이력서 요약:
{resume_summary}

- 이력서 키워드:
{resume_keywords}

아래 형식을 따라줘:
딕셔너리 형태에서 key는 3가지 질문 부문이야. '경력 및 경험', '동기 및 커뮤니케이션', '논리적 사고'
각 key에 해당하는 value는 딕셔너리 형태로 여기의 key는 2가지로 '질문전략', '예시질문' 이야.
'질문전략'의 value는 각 질문 부문에 대해서, 이력서요약 및 키워드로부터 질문 전략 및 방향을 결정하는 구체적인 문장이야.
'예시질문'의 value는 리스트형태로, 질문전략에 맞는 구체적인 예시 질문 2개 문장이야.

[예시]
{{{{ "경력 및 경험": {{'질문전략' : "지원자의 실무 경험, 기술적 능력 및 프로젝트 관리 경험을 중점적으로 평가하는 방향으로 질문을 구성합니다. 이를 통해 지원자가 과거에 경험한 기술적 도전과 문제 해결 방식, 팀 내의 역할 등을 확인할 수 있습니다.",
'예시질문': ['KT의 AI 연구소에서 인턴으로 근무하며 OCR 기반 문서 처리 시스템을 고도화할 때 겪었던 기술적 난관은 무엇이었고, 이를 어떻게 극복했는지 설명해 주시겠습니까?',
'빅데이터 학생연합에서 프로젝트를 리드했던 경험에 대해 이야기해 주세요. 어떤 과제가 있었고, 팀원들과의 소통 과정에서 어려움은 없었는지 궁금합니다.']}},
"동기 및 커뮤니케이션": ...,
"논리적 사고": ...
}}}}
앞뒤로 ```python ~ ``` 붙이는것은 하지 마.
""")

    llm = ChatOpenAI(model="gpt-4o-mini")
    formatted_prompt = prompt.format(resume_summary=resume_summary, resume_keywords=resume_keywords)
    response = llm.invoke(formatted_prompt)

    # 딕셔너리로 변환
    dict_value = response.content.strip()
    if isinstance(dict_value, str):
        try:
            strategy_dict = ast.literal_eval(dict_value)
        except Exception as e:
            raise ValueError("question_strategy를 딕셔너리로 변환하는 데 실패했습니다.") from e

    return {
        **state,
        "question_strategy": strategy_dict
    }

# 5) 1단계 하나로 묶기 --------------------

def preProcessing_Interview(file_path: str) -> InterviewState:
    # 파일 입력
    resume_text = extract_text_from_file(file_path)

    # state 초기화
    initial_state: InterviewState = {
        "resume_text": resume_text,
        "resume_summary": '',
        "resume_keywords": [],
        "question_strategy": {},

        "current_question": '',
        "current_answer": '',
        "current_strategy": '',
        "conversation": [],
        "evaluation": [],
        "next_step" : ''
    }

    # Resume 분석
    state = analyze_resume(initial_state)

    # 질문 전략 수립
    state = generate_question_strategy(state)

    # 첫번째 질문 생성
    question_strategy = state["question_strategy"]
    example_questions = question_strategy["경력 및 경험"]["예시질문"]
    selected_question = random.choice(example_questions)

    return {
            **state,
            "current_question": selected_question,
            "current_strategy": "경력 및 경험"
            }


## ---------------- 2단계 : 면접 Agent ----------------------

# 1) 답변 입력 --------------------
def update_current_answer(state: InterviewState, user_answer: str) -> InterviewState:
    return {
        **state,
        "current_answer": user_answer.strip()
    }

# 2) 답변 평가 --------------------
def evaluate_answer(state: InterviewState) -> InterviewState:
    llm = ChatOpenAI(model="gpt-4o-mini")

    current_question = state.get("current_question", "")
    current_answer = state.get("current_answer", "")
    current_strategy = state.get("current_strategy", "")
    question_strategy = state.get("question_strategy", "")
    resume_summary = state.get("resume_summary", "")
    resume_keywords = ", ".join(state.get("resume_keywords", []))

    # 질문 전략 추출
    strategy_block = ""
    if isinstance(question_strategy, dict):
        strategy_block = question_strategy.get(current_strategy, {}).get("질문전략", "")
    elif isinstance(question_strategy, str):
        try:
            parsed = ast.literal_eval(question_strategy)
            strategy_block = parsed.get(current_strategy, {}).get("질문전략", "")
        except Exception:
            strategy_block = ""

    # 프롬프트 구성
    prompt = ChatPromptTemplate.from_template("""
당신은 인터뷰 평가를 위한 AI 평가자입니다.
다음의 참조 정보(지원자의 이력서 요약, 키워드, 질문 전략, 현재 질문과 답변)를 확인하세요.
[참고 정보]
- 이력서 요약: {resume_summary}
- 이력서 키워드: {resume_keywords}
- 질문 전략({current_strategy}): {strategy}
- 질문: {question}
- 답변: {answer}

위 정보를 바탕으로 아래 두 가지 항목에 따라 [답변]을 평가해 주세요.
- [답변]이 너무 짧거나 비어 있으면 낮게 평가.
항목 평가 기준
- 질문과의 연관성: 질문에 대해 답변이 얼마나 밀접하게 관련되어 있는지 평가해 주세요.
- 답변의 구체성: 답변이 얼마나 구체적이고 실질적인 예시나 경험 및 설명을 포함하고 있는지를 평가해 주세요.
각 항목에 대해 '상', '중', '하' 중 하나로 평가해 주세요.
- 상 : 우수, 질문의 핵심 의도에 정확히 부합하며, 전반적인 내용을 명확히 다룸
- 중 : 보통, 질문과 관련은 있지만 핵심 포인트가 부분적으로 누락됨
- 하 : 미흡, 질문과 관련이 약하거나 엉뚱한 내용 중심

최종 결과는 아래 형식의 딕셔너리로만 출력해 주세요
출력 예시 :
{{
  "질문과의 연관성": "상",
  "답변의 구체성": "중"
}}
""")

    formatted_prompt = prompt.format(
        resume_summary=resume_summary,
        resume_keywords=resume_keywords,
        strategy=strategy_block,
        current_strategy=current_strategy,
        question=current_question,
        answer=current_answer
    )

    response = llm.invoke(formatted_prompt)
    # print(response.content.strip())
    # 딕셔너리로 변환
    eval_dict = response.content.strip()
    if isinstance(eval_dict, str):
        try:
            eval_dict = ast.literal_eval(eval_dict)
        except Exception as e:
            raise ValueError("question_strategy를 딕셔너리로 변환하는 데 실패했습니다.") from e

    # (1) 대화 저장 (질문/답변 1쌍)
    state["conversation"].append({"question": current_question, "answer": current_answer})

    # (2) 평가 저장 (인덱스 포함)
    evaluation = state.get("evaluation", [])
    eval_dict["question_index"] = len(state["conversation"]) - 1
    evaluation.append(eval_dict)

    return {
        **state,
        "evaluation": evaluation
    }

# 3) 인터뷰 진행 검토 --------------------
def decide_next_step(state: InterviewState) -> InterviewState:
    evaluation = state.get("evaluation", [])
    conversation = state.get("conversation", [])

    # (1) 질문-답변 수가 3회를 초과하면 종료
    if len(conversation) > 3:
        next_step = "end"

    # (2) 가장 최근 평가에서 '하'가 포함되어 있으면 추가 질문
    else :
        next_step = "additional_question"

    return {
        **state,
        "next_step": next_step
    }

# 4) 질문 생성 --------------------
def generate_question(state: InterviewState) -> InterviewState:
    llm = ChatOpenAI(model="gpt-4o-mini")
    resume_summary = state.get("resume_summary", "")
    resume_keywords = ", ".join(state.get("resume_keywords", []))
    question_strategy = state.get("question_strategy", {})
    current_strategy = state.get("current_strategy", "")
    stragety = question_strategy[current_strategy]['질문전략']
    current_question = state.get("current_question", "")
    current_answer = state.get("current_answer", "")
    evaluation = state.get("evaluation", [])

    last_evaluation = evaluation[-1] if evaluation else {}

    # 심화(추가) 질문
    prompt = ChatPromptTemplate.from_template("""
당신은 인터뷰 질문을 설계하는 AI입니다.

다음은 추가 질문을 생성하기 위해 참조할 중요한 정보입니다.
- 이력서 요약: {resume_summary}
- 이력서 키워드: {resume_keywords}
- 질문 전략({current_strategy}): {strategy}
- 이전 질문: {current_question}
- 답변: {current_answer}
- 평가: {evaluation}

위 정보를 기반으로 지원자의 사고력, 문제 해결 방식, 혹은 기술적 깊이를 더 확인할 수 있는 심화 인터뷰 질문을 한 가지 생성해주세요.
구체적이고, 지원자의 대답을 확장시킬 수 있는 질문이어야 합니다. 또한 날카로운 질문이어야 합니다. 질문은 한 문장으로 생성합니다.
""")

    formatted_prompt = prompt.format(
        current_question=current_question,
        current_answer=current_answer,
        evaluation=str(last_evaluation),
        resume_summary=resume_summary,
        resume_keywords=resume_keywords,
        strategy=stragety,
        current_strategy=current_strategy
    )

    response = llm.invoke(formatted_prompt)

    return {
        **state,
        "current_question": response.content.strip(),
        "current_answer": ""
    }

# 5) 인터뷰 피드백 보고서 --------------------
def summarize_interview(state: InterviewState) -> InterviewState:
    print("\n 인터뷰 종료 보고서")
    print("-" * 50)
    for i, turn in enumerate(state["conversation"]):
        print(f"[질문 {i+1}] {turn['question']}")
        print(f"[답변 {i+1}] {turn['answer']}")
        if i < len(state["evaluation"]):
            eval_result = state["evaluation"][i]
            print(f"[평가] 질문과의 연관성: {eval_result['질문과의 연관성']}, 답변의 구체성: {eval_result['답변의 구체성']}")
        print("-" * 50)
    return state

# 6) Agent --------------------
# 분기 판단 함수
def route_next(state: InterviewState) -> Literal["generate", "summarize"]:
    return "summarize" if state["next_step"] == "end" else "generate"

# 그래프 정의 시작
builder = StateGraph(InterviewState)

# 노드 추가
builder.add_node("evaluate", evaluate_answer)
builder.add_node("decide", decide_next_step)
builder.add_node("generate", generate_question)
builder.add_node("summarize", summarize_interview)

# 노드 연결
builder.set_entry_point("evaluate")
builder.add_edge("evaluate", "decide")
builder.add_conditional_edges("decide", route_next)
builder.add_edge("generate", END)      # 루프
builder.add_edge("summarize", END)            # 종료

# 컴파일
graph = builder.compile()
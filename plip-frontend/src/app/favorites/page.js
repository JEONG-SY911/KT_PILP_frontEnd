'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/utils/api';
import Link from 'next/link';
import Image from 'next/image';

export default function FavoritesPage() {
  const [userInfo, setUserInfo] = useState(() => {
    // 페이지 로드 시 로컬 스토리지에서 사용자 정보 확인
    if (typeof window !== 'undefined') {
      const savedUserInfo = localStorage.getItem('userInfo');
      if (savedUserInfo && savedUserInfo !== 'undefined' && savedUserInfo !== 'null') {
        try {
          return JSON.parse(savedUserInfo);
        } catch (error) {
          console.error('사용자 정보 파싱 오류:', error);
          return null;
        }
      }
      return null;
    }
    return null;
  });
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // 프로필 수정 관련 상태
  const [editNickname, setEditNickname] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // 상태 추가 (파일 상단에)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);





  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // 로그인 상태 확인
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const savedUserInfo = localStorage.getItem('userInfo');
        
        console.log('마이페이지 - 로그인 상태:', isLoggedIn);
        console.log('마이페이지 - 저장된 사용자 정보:', savedUserInfo);
        
        if (!isLoggedIn || !savedUserInfo) {
          // 로그인하지 않은 경우 메인 페이지로 리다이렉트
          window.location.href = '/';
          return;
        }
        
        // 현재 닉네임을 편집 필드에 설정
        setEditNickname(userInfo?.nickname || '');
        
        // 실제 즐겨찾기 데이터 로드
        try {
          const favoritesData = await apiClient.getMyFavorites();
          setFavorites(favoritesData);
        } catch (error) {
          console.error('즐겨찾기 로드 실패:', error);
          // API 실패 시 빈 배열로 설정
          setFavorites([]);
        }
      } catch (err) {
        setError('사용자 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [userInfo]); // userInfo 의존성 다시 추가





  // 프로필 수정 처리
  const handleUpdateProfile = async () => {
    try {
      setProfileError('');
      setProfileSuccess('');

      if (!editNickname.trim()) {
        setProfileError('닉네임을 입력해주세요.');
        return;
      }

      if (editNickname === userInfo?.nickname) {
        setProfileError('현재 닉네임과 동일합니다.');
        return;
      }

      const response = await apiClient.updateProfile({
        nickname: editNickname
      });

      // 로컬 스토리지의 사용자 정보 업데이트
      const updatedUserInfo = { ...userInfo, nickname: editNickname };
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      setUserInfo(updatedUserInfo);

      setProfileSuccess('프로필이 성공적으로 수정되었습니다!');
      setIsEditing(false); // 편집 모드 종료
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (error) {
      setProfileError(error.message || '프로필 수정에 실패했습니다.');
    }
  };

  // 편집 모드 토글
  const handleEditToggle = () => {
    if (isEditing) {
      // 편집 모드 종료 시 원래 값으로 복원
      setEditNickname(userInfo?.nickname || '');
      setProfileError('');
      setProfileSuccess('');
    }
    setIsEditing(!isEditing);
  };

  // 즐겨찾기 삭제 함수
  const handleDeleteFavorite = async (adstrdCodeSe) => {
    try {
      await apiClient.deleteFavorite(adstrdCodeSe);
      setFavorites(favorites.filter(fav => fav.adstrdCodeSe !== adstrdCodeSe));
      setDeleteMessage('즐겨찾기가 삭제되었습니다.');
      setTimeout(() => setDeleteMessage(''), 3000);
    } catch (error) {
      console.error('즐겨찾기 삭제 실패:', error);
      setDeleteMessage('즐겨찾기 삭제에 실패했습니다.');
      setTimeout(() => setDeleteMessage(''), 3000);
    }
  };

  // 회원 삭제 관련 함수들 추가
  const handleDeleteAccountClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteAccountLoading(true);
      
      await apiClient.deleteAccount();
      
      // 로컬 스토리지 정리
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userInfo');
      
      // 성공 메시지 표시 후 홈으로 이동
      alert('회원 탈퇴가 완료되었습니다.');
      window.location.href = '/';
      
    } catch (error) {
      console.error('회원 삭제 실패:', error);
      alert('회원 탈퇴에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setDeleteAccountLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">마이페이지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">데이터 로드 오류</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="gap-2 text-gray-600 hover:text-black hover:bg-transparent transition-colors flex items-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to home
              </button>
              <div className="h-4 w-px bg-gray-200"></div>
              <div>
                <h1 className="text-xl font-semibold text-black">My Page</h1>
                <p className="text-sm text-gray-600">Personal information and favorites</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 사용자 프로필 카드 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-6">
                         <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
               <span className="text-white text-2xl font-bold">
                 {(userInfo?.nickname || userInfo?.username || 'U')?.charAt(0).toUpperCase()}
               </span>
             </div>
             <div className="flex-1">
               <h2 className="text-2xl font-bold text-gray-900 mb-2">
                 {userInfo?.nickname || userInfo?.username || '사용자'}님
               </h2>
              <p className="text-gray-600 mb-2">{userInfo?.email}</p>
              <div className="flex space-x-4 text-sm text-gray-500">
                <span>가입일: {userInfo?.joinDate}</span>
                <span>최근 로그인: {userInfo?.lastLogin}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                🟢 활성 상태
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                👤 프로필 정보
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'favorites'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⭐ 즐겨찾기 ({favorites.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚙️ 설정
              </button>
            </nav>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="p-6">
            {/* 프로필 정보 탭 */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">프로필 정보</h3>
                
                                 {/* 읽기 전용 정보 */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                     <input
                       type="text"
                       value={userInfo?.username || ''}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
                       readOnly
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                     <input
                       type="email"
                       value={userInfo?.email || ''}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
                       readOnly
                     />
                   </div>
                 </div>

                                 {/* 프로필 수정 섹션 */}
                 <div className="border-t border-gray-200 pt-6">
                   <div className="flex justify-between items-center mb-4">
                     <h4 className="text-md font-semibold text-gray-900">닉네임 수정</h4>
                     <button
                       onClick={handleEditToggle}
                       className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                     >
                       {isEditing ? '취소' : '수정'}
                     </button>
                   </div>
                   
                   {isEditing ? (
                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">현재 닉네임</label>
                         <input
                           type="text"
                           value={userInfo?.nickname || ''}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
                           readOnly
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">새 닉네임</label>
                         <input
                           type="text"
                           value={editNickname}
                           onChange={(e) => setEditNickname(e.target.value)}
                           placeholder="새로운 닉네임을 입력하세요"
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                         />
                       </div>
                       <div className="flex space-x-3">
                         <button
                           onClick={handleUpdateProfile}
                           disabled={!editNickname.trim() || editNickname === userInfo?.nickname}
                           className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                         >
                           저장
                         </button>
                         <button
                           onClick={handleEditToggle}
                           className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                         >
                           취소
                         </button>
                       </div>
                       {profileError && (
                         <p className="text-red-500 text-sm">{profileError}</p>
                       )}
                       {profileSuccess && (
                         <p className="text-green-500 text-sm">{profileSuccess}</p>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">현재 닉네임</label>
                         <input
                           type="text"
                           value={userInfo?.nickname || ''}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-900"
                           readOnly
                         />
                       </div>
                       <p className="text-sm text-gray-500">수정 버튼을 클릭하여 닉네임을 변경할 수 있습니다.</p>
                     </div>
                   )}
                 </div>
              </div>
            )}

            {/* 즐겨찾기 탭 */}
            {activeTab === 'favorites' && (
              <div>
                {/* 삭제 메시지 */}
                {deleteMessage && (
                  <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                    deleteMessage.includes('삭제되었습니다') 
                      ? 'bg-green-100 border border-green-400 text-green-700' 
                      : 'bg-red-100 border border-red-400 text-red-700'
                  }`}>
                    {deleteMessage}
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">즐겨찾기 지역</h3>
                  <span className="text-sm text-gray-500">총 {favorites.length}개 지역</span>
                </div>
                
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">⭐</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">즐겨찾기한 지역이 없습니다</h4>
                    <p className="text-gray-900 mb-4">관심 있는 지역을 즐겨찾기에 추가해보세요</p>
                    <Link 
                      href="/seoul-dashboard"
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      서울 대시보드 보기
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                                                         <div className="flex items-center space-x-3 mb-2">
                               <h4 className="font-semibold text-gray-900">
                                 {favorite.dongName || favorite.districtName}
                               </h4>
                               <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                 {favorite.adstrdCodeSe}
                               </span>
                             </div>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                               <div>
                                 <span className="text-gray-900">설명:</span>
                                 <span className="font-medium ml-1 text-gray-900">{favorite.description}</span>
                               </div>
                               <div>
                                 <span className="text-gray-900">추가일:</span>
                                 <span className="font-medium ml-1 text-gray-900">
                                   {favorite.createdAt ? new Date(favorite.createdAt).toLocaleDateString() : 'N/A'}
                                 </span>
                               </div>
                             </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => window.location.href = `/gangnam-dongs`}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              상세보기
                            </button>
                                                         <button
                               onClick={() => handleDeleteFavorite(favorite.adstrdCodeSe)}
                               className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                             >
                               삭제
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 설정 탭 */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">계정 설정</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">비밀번호 변경</h4>
                      <p className="text-sm text-gray-500">계정 보안을 위해 정기적으로 비밀번호를 변경하세요</p>
                    </div>
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      변경하기
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">알림 설정</h4>
                      <p className="text-sm text-gray-500">새로운 데이터 업데이트 알림을 받을지 설정하세요</p>
                    </div>
                    <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      설정하기
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">계정 삭제</h4>
                      <p className="text-sm text-gray-500">계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</p>
                    </div>
                    <button 
                      onClick={handleDeleteAccountClick}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      삭제하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">즐겨찾기 지역</div>
            <div className="text-2xl font-bold text-gray-900">{favorites.length}개</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">가입일</div>
            <div className="text-2xl font-bold text-gray-900">{userInfo?.joinDate}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">최근 로그인</div>
            <div className="text-2xl font-bold text-gray-900">{userInfo?.lastLogin}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">계정 상태</div>
            <div className="text-2xl font-bold text-green-600">활성</div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="font-semibold mb-2">PLIP 마이페이지</h4>
            <p className="text-gray-400 text-sm">
              개인 정보 관리 및 즐겨찾기 기능을 제공합니다
            </p>
          </div>
        </div>
      </footer>

      {/* 회원 삭제 확인 팝업 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                정말로 탈퇴하시겠습니까?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleteAccountLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleteAccountLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      삭제 중...
                    </div>
                  ) : (
                    '탈퇴하기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

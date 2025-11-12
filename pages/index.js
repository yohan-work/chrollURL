import { useState, useEffect } from 'react';
import Head from 'next/head';

// 히스토리 관리 훅
function useHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // 로컬 스토리지에서 히스토리 불러오기
    const savedHistory = localStorage.getItem('urlHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  const addToHistory = (data) => {
    const historyItem = {
      id: Date.now(),
      url: data.url,
      title: data.title,
      image: data.image,
      siteName: data.siteName,
      favicon: data.favicon,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [historyItem, ...history.filter(item => item.url !== data.url)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('urlHistory', JSON.stringify(newHistory));
  };

  const removeFromHistory = (id) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('urlHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('urlHistory');
  };

  return { history, addToHistory, removeFromHistory, clearHistory };
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory();

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const copyToClipboard = async (text, format) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${format} 형식으로 복사되었습니다`);
    } catch (err) {
      showToast('복사에 실패했습니다');
    }
  };

  const handleCopyMarkdown = () => {
    const markdown = `[${result.title}](${result.url})`;
    copyToClipboard(markdown, '마크다운');
  };

  const handleCopyJson = () => {
    const json = JSON.stringify(result, null, 2);
    copyToClipboard(json, 'JSON');
  };

  const handleCopyText = () => {
    const text = `제목: ${result.title}\n\nURL: ${result.url}\n\n${result.description || result.content}`;
    copyToClipboard(text, '텍스트');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('URL을 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다');
      }

      setResult(data);
      addToHistory(data); // 히스토리에 추가
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = async (historyUrl) => {
    setUrl(historyUrl);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: historyUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '오류가 발생했습니다');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>URL 정보 추출기</title>
        <meta name="description" content="웹페이지의 주요 정보를 자동으로 추출합니다" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* 헤더 */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              URL 정보 추출기
            </h1>
            <p className="text-lg text-gray-600">
              웹페이지의 제목, 이미지, 본문을 자동으로 추출합니다
            </p>
          </div>

          {/* 입력 폼 */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <label htmlFor="url" className="block text-sm font-semibold text-gray-900 mb-3">
                웹페이지 URL
              </label>
              <div className="flex gap-3">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? '추출 중...' : '추출하기'}
                </button>
              </div>
            </div>
          </form>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-1">오류 발생</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 로딩 상태 */}
          {loading && (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">페이지 정보를 가져오는 중...</p>
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {result && !loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* 이미지 */}
              {result.image && (
                <div className="w-full h-64 bg-gray-100 relative">
                  <img
                    src={result.image}
                    alt={result.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* 내용 */}
              <div className="p-8">
                {/* 사이트 정보 (파비콘 + 사이트명) */}
                {(result.favicon || result.siteName) && (
                  <div className="flex items-center gap-2 mb-4">
                    {result.favicon && (
                      <img 
                        src={result.favicon} 
                        alt="favicon" 
                        className="w-5 h-5"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {result.siteName && (
                      <span className="text-sm font-medium text-gray-600">
                        {result.siteName}
                      </span>
                    )}
                  </div>
                )}

                {/* 제목 */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {result.title}
                </h2>

                {/* 메타 정보 (작성자, 날짜) */}
                {(result.author || result.publishedDate) && (
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-600">
                    {result.author && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{result.author}</span>
                      </div>
                    )}
                    {result.publishedDate && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(result.publishedDate).toLocaleDateString('ko-KR')}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* URL */}
                <div className="mb-4">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center break-all"
                  >
                    {result.url}
                    <svg className="w-4 h-4 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* 설명 */}
                {result.description && (
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {result.description}
                    </p>
                  </div>
                )}

                {/* 키워드 */}
                {result.keywords && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {result.keywords.split(',').map((keyword, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {keyword.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 구분선 */}
                <div className="border-t border-gray-200 my-6"></div>

                {/* 본문 */}
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">본문 미리보기</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {result.content}
                  </p>
                </div>

                {/* 복사 버튼들 */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      마크다운 복사
                    </button>
                    <button
                      onClick={handleCopyJson}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      JSON 복사
                    </button>
                    <button
                      onClick={handleCopyText}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-primary hover:text-primary transition-all font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      텍스트 복사
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          {!result && !loading && !error && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <p className="text-gray-500">
                URL을 입력하고 추출하기 버튼을 눌러주세요
              </p>
            </div>
          )}

          {/* 히스토리 섹션 */}
          {history.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">최근 추출 기록</h2>
                <button
                  onClick={clearHistory}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  전체 삭제
                </button>
              </div>
              
              <div className="grid gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-primary transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* 썸네일 또는 파비콘 */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : item.favicon ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img
                              src={item.favicon}
                              alt="favicon"
                              className="w-8 h-8"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* 정보 */}
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => loadFromHistory(item.url)}
                      >
                        {item.siteName && (
                          <div className="text-xs text-gray-500 mb-1">{item.siteName}</div>
                        )}
                        <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-600 truncate mb-2">{item.url}</p>
                        <div className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleString('ko-KR')}
                        </div>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.id);
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toast}</span>
          </div>
        </div>
      )}
    </>
  );
}


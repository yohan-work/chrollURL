## 기능(onGoing)

- 제목(title) 추출: Open Graph → title 태그 → h1 순서로 시도
- 이미지(image) 추출: Open Graph → 첫 번째 img 태그
- 본문(content) 추출: article → main → p 태그들 (상위 5개)


## API 명세

### POST /api/scrape

웹페이지 정보를 추출합니다.

**요청**
```json
{
  "url": "https://example.com"
}
```

**응답 (성공)**
```json
{
  "title": "페이지 제목",
  "image": "https://example.com/image.jpg",
  "content": "본문 텍스트...",
  "url": "https://example.com"
}
```

**응답 (실패)**
```json
{
  "error": "에러 메시지"
}
```

## NOTI

- 일부 웹사이트는 스크래핑을 차단
- CORS 정책으로 인해 일부 사이트에서는 작동하지 않음
- 개발 환경에서만 테스트되었으며, 프로덕션 사용 시 추가 보안 및 최적화가 필요

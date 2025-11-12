import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL이 필요합니다" });
  }

  try {
    // URL 유효성 검사
    new URL(url);

    // HTML 가져오기
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 제목 추출 (우선순위: og:title → title → h1)
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      $("h1").first().text() ||
      "제목 없음";
    title = title.trim();

    // 이미지 추출 (우선순위: og:image → 첫 번째 img)
    let image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $("img").first().attr("src") ||
      null;

    // 상대 경로를 절대 경로로 변환
    if (image && !image.startsWith("http")) {
      const urlObj = new URL(url);
      if (image.startsWith("//")) {
        image = urlObj.protocol + image;
      } else if (image.startsWith("/")) {
        image = urlObj.origin + image;
      } else {
        image = urlObj.origin + "/" + image;
      }
    }

    // 본문 추출 (우선순위: article → main → p 태그들)
    let content = "";

    const $article = $("article");
    if ($article.length > 0) {
      // article 내부의 p 태그들
      content = $article
        .find("p")
        .slice(0, 5)
        .map((i, el) => $(el).text().trim())
        .get()
        .join(" ");
    }

    if (!content) {
      const $main = $("main");
      if ($main.length > 0) {
        // main 내부의 p 태그들
        content = $main
          .find("p")
          .slice(0, 5)
          .map((i, el) => $(el).text().trim())
          .get()
          .join(" ");
      }
    }

    if (!content) {
      // 전체 페이지에서 상위 5개 p 태그
      content = $("p")
        .slice(0, 5)
        .map((i, el) => $(el).text().trim())
        .get()
        .join(" ");
    }

    // meta description을 대체로 사용
    if (!content || content.length < 50) {
      content =
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        "본문 내용을 찾을 수 없습니다";
    }

    content = content.trim();

    // 너무 길면 자르기 (500자)
    if (content.length > 500) {
      content = content.substring(0, 500) + "...";
    }

    // 작성자 추출
    const author =
      $('meta[property="og:article:author"]').attr("content") ||
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      null;

    // 게시일 추출
    const publishedDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[property="og:article:published_time"]').attr("content") ||
      $('meta[name="publish_date"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $("time[datetime]").attr("datetime") ||
      null;

    // 사이트명 추출
    let siteName =
      $('meta[property="og:site_name"]').attr("content") ||
      $('meta[name="application-name"]').attr("content") ||
      null;

    // 사이트명이 없으면 도메인에서 추출
    if (!siteName) {
      const urlObj = new URL(url);
      siteName = urlObj.hostname.replace("www.", "");
    }

    // 파비콘 추출
    let favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href") ||
      null;

    // 파비콘 상대 경로를 절대 경로로 변환
    if (favicon && !favicon.startsWith("http")) {
      const urlObj = new URL(url);
      if (favicon.startsWith("//")) {
        favicon = urlObj.protocol + favicon;
      } else if (favicon.startsWith("/")) {
        favicon = urlObj.origin + favicon;
      } else {
        favicon = urlObj.origin + "/" + favicon;
      }
    }

    // 키워드 추출
    const keywords =
      $('meta[name="keywords"]').attr("content") ||
      $('meta[property="article:tag"]').attr("content") ||
      null;

    // 설명(description) 추출
    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      null;

    return res.status(200).json({
      title,
      image,
      content,
      url,
      author,
      publishedDate,
      siteName,
      favicon,
      keywords,
      description,
    });
  } catch (error) {
    console.error("Scraping error:", error);

    if (error.code === "ENOTFOUND") {
      return res.status(400).json({ error: "유효하지 않은 URL입니다" });
    }

    if (error.code === "ECONNABORTED") {
      return res.status(408).json({ error: "요청 시간이 초과되었습니다" });
    }

    return res.status(500).json({
      error: "페이지 정보를 가져오는 중 오류가 발생했습니다",
      details: error.message,
    });
  }
}

/**
 * 湘潭大学网络与信息中心 MCP
 * Cloudflare Worker · Streamable HTTP（无状态 JSON-RPC）
 *
 * 官网：https://nic.xtu.edu.cn/
 * 搜索：https://nic.xtu.edu.cn/search.jsp?wbtreeid=1001
 */

const DEFAULT_UUID = "417e7515-b174-45ed-89c1-3838b6100cd7";
const SITE = "https://nic.xtu.edu.cn";
const SEARCH_PATH = "/search.jsp";
const UA =
  "Mozilla/5.0 (compatible; XTU-NIC-MCP/1.0; +https://nic.xtu.edu.cn)";
const PROTOCOL = "2025-03-26";

const SERVER_INFO = {
  name: "xtu-nic-mcp",
  title: "湘潭大学网络与信息中心检索",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "search_nic",
    description:
      "检索湘潭大学网络与信息中心（nic.xtu.edu.cn）官网内容，包括校园网、VPN、校园卡、信息门户、网络安全、信息化项目、通知公告、规章制度等。使用官网 Lucene 站内搜索。",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "检索关键词，例如：校园网、VPN、校园卡、邮箱、信息门户、域名申请",
        },
        page: {
          type: "integer",
          minimum: 1,
          default: 1,
          description: "页码，从 1 开始，默认 1",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_article",
    description:
      "读取湘潭大学网络与信息中心官网文章正文，并提取附件链接。可传相对路径或完整 URL；仅直接抓取 nic.xtu.edu.cn 页面。",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "例如 info/1021/2336.htm 或完整 nic.xtu.edu.cn URL",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "list_sections",
    description:
      "列出湘潭大学网络与信息中心官网的常用栏目入口，如校园网、VPN、校园卡、信息安全、常见问题、下载专区等。",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

const SECTIONS = {
  home: `${SITE}/`,
  center_intro: `${SITE}/zxgk/zxjj.htm`,
  campus_network_intro: `${SITE}/zxgk/xywjj.htm`,
  rules_policy: `${SITE}/gzzd/zcfg.htm`,
  rules_internal: `${SITE}/gzzd/xngz.htm`,
  notices: `${SITE}/wldt/tzgg.htm`,
  center_news: `${SITE}/wldt/zxdt.htm`,
  user_services: `${SITE}/yhfw.htm`,
  personal_portal: `${SITE}/yhfw/grxxmh.htm`,
  campus_card: `${SITE}/yhfw/xyykt.htm`,
  access_control: `${SITE}/yhfw/xymj.htm`,
  vpn: `${SITE}/yhfw/vpnfw.htm`,
  campus_network_access: `${SITE}/yhfw/xywjr.htm`,
  xtu_email: `${SITE}/yhfw/xdyx.htm`,
  website_management: `${SITE}/yhfw/wzjsgl.htm`,
  vm_application: `${SITE}/yhfw/yzjsq.htm`,
  ip_domain_mapping: `${SITE}/yhfw/IP_ym_dzyssq.htm`,
  server_hosting: `${SITE}/yhfw/sbtg.htm`,
  ipv6: `${SITE}/yhfw/IPv6yy.htm`,
  information_project: `${SITE}/yhfw/xxhxmgl.htm`,
  freshman_service: `${SITE}/yhfw/xsfw.htm`,
  quick_network_guide: `${SITE}/kstd/xtdxxywjrsysm.htm`,
  portal_guide: `${SITE}/kstd/xxmhsyzn.htm`,
  security_warning: `${SITE}/xxwlaq/aqyj.htm`,
  security_service: `${SITE}/xxwlaq/aqfw.htm`,
  mlps: `${SITE}/xxwlaq/dbdj.htm`,
  faq: `${SITE}/cjwt.htm`,
  downloads: `${SITE}/xzzq.htm`,
  contact: `${SITE}/lxwm/lxwm.htm`,
  search: `${SITE}${SEARCH_PATH}?wbtreeid=1001`,
};

export default {
  async fetch(request, env) {
    const uuid = String(env.ACCESS_UUID || DEFAULT_UUID).toLowerCase();
    const url = new URL(request.url);
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    if (
      request.method === "GET" &&
      parts.length === 1 &&
      parts[0].toLowerCase() === "health"
    ) {
      return cors(
        json({
          ok: true,
          service: SERVER_INFO.name,
          version: SERVER_INFO.version,
          hint: "MCP 地址为 /<ACCESS_UUID>/mcp，使用 Streamable HTTP / http。",
        })
      );
    }

    if (parts[0]?.toLowerCase() !== uuid) {
      return new Response("Not Found", { status: 404 });
    }

    const rest = parts.slice(1).join("/") || "";
    const isMcpPath =
      rest === "" ||
      rest === "health" ||
      rest === "mcp" ||
      rest === "sse" ||
      rest === "message" ||
      rest === "messages" ||
      rest === "mcp/sse" ||
      rest === "mcp/message" ||
      rest === "mcp/messages";

    if (!isMcpPath) return new Response("Not Found", { status: 404 });

    if (
      request.method === "GET" &&
      (rest === "" || rest === "health") &&
      !acceptsEventStream(request)
    ) {
      return cors(
        json({
          ok: true,
          service: SERVER_INFO.name,
          version: SERVER_INFO.version,
          mcp: `/${uuid}/mcp`,
          hint: "type 使用 streamableHttp / http，不要使用旧 SSE。",
        })
      );
    }

    if (request.method === "GET") {
      return cors(
        new Response("Method Not Allowed. Use POST JSON-RPC (Streamable HTTP).", {
          status: 405,
          headers: {
            Allow: "POST, OPTIONS",
            "Content-Type": "text/plain; charset=utf-8",
          },
        })
      );
    }

    if (request.method === "DELETE") {
      return cors(
        new Response(null, {
          status: 405,
          headers: { Allow: "POST, OPTIONS" },
        })
      );
    }

    if (request.method !== "POST") {
      return cors(new Response("Method Not Allowed", { status: 405 }));
    }

    return handleMcp(request);
  },
};

async function handleMcp(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return cors(
      json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        },
        400
      )
    );
  }

  if (Array.isArray(body)) {
    const out = [];
    for (const item of body) {
      const res = await dispatch(item);
      if (res) out.push(res);
    }
    return cors(json(out));
  }

  const res = await dispatch(body);
  if (!res) return cors(new Response(null, { status: 202 }));
  return cors(json(res));
}

async function dispatch(msg) {
  if (!msg || typeof msg !== "object") {
    return rpcError(null, -32600, "Invalid Request");
  }

  const { id, method, params } = msg;
  const isNotify = id === undefined || id === null;

  try {
    switch (method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: params?.protocolVersion || PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions:
            "检索湘潭大学网络与信息中心官网。通常先用 search_nic 搜索，再用 get_article 读取正文；list_sections 可查看常用服务栏目。",
        });

      case "notifications/initialized":
      case "notifications/cancelled":
      case "notifications/progress":
        return null;

      case "ping":
        return isNotify ? null : rpcResult(id, {});

      case "tools/list":
        return rpcResult(id, { tools: TOOLS });

      case "tools/call":
        return rpcResult(id, await callTool(params || {}));

      case "resources/list":
        return rpcResult(id, { resources: [] });

      case "resources/templates/list":
        return rpcResult(id, { resourceTemplates: [] });

      case "prompts/list":
        return rpcResult(id, { prompts: [] });

      default:
        if (isNotify) return null;
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    if (isNotify) return null;
    return rpcError(id, -32000, String(err?.message || err));
  }
}

async function callTool(params) {
  const name = params.name;
  const args = params.arguments || {};

  if (name === "search_nic") {
    const query = String(args.query || "").trim();
    if (!query) return textResult("请提供 query。", true);

    const page = Math.max(1, Number(args.page || 1) || 1);
    const results = await searchNic(query, page);
    return textResult(JSON.stringify(results, null, 2));
  }

  if (name === "get_article") {
    const raw = String(args.url || "").trim();
    if (!raw) return textResult("请提供 url。", true);

    const article = await getArticle(raw);
    return textResult(JSON.stringify(article, null, 2));
  }

  if (name === "list_sections") {
    return textResult(JSON.stringify(SECTIONS, null, 2));
  }

  return textResult(`未知工具: ${name}`, true);
}

function textResult(text, isError = false) {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

async function searchNic(query, page) {
  const encoded = utf8Base64(query);
  let html;

  if (page <= 1) {
    const body = new URLSearchParams({
      lucenenewssearchkey: encoded,
      _lucenesearchtype: "1",
      searchScope: "0",
      showkeycode: query,
    });

    const res = await fetch(`${SITE}${SEARCH_PATH}?wbtreeid=1001`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: SITE,
        Referer: `${SITE}/`,
      },
      body,
    });

    if (!res.ok) throw new Error(`搜索失败 HTTP ${res.status}`);
    html = await res.text();
  } else {
    const u = new URL(`${SITE}${SEARCH_PATH}`);
    u.searchParams.set("wbtreeid", "1001");
    u.searchParams.set("searchScope", "0");
    u.searchParams.set("currentnum", String(page));
    u.searchParams.set("newskeycode2", encoded);
    u.searchParams.set("order", "");
    u.searchParams.set("range", "");

    const res = await fetch(u, {
      headers: {
        "User-Agent": UA,
        Referer: `${SITE}${SEARCH_PATH}?wbtreeid=1001`,
      },
    });

    if (!res.ok) throw new Error(`搜索失败 HTTP ${res.status}`);
    html = await res.text();
  }

  const items = parseSearchResults(html);
  const meta = parsePagination(html);

  return {
    query,
    page,
    source: `${SITE}${SEARCH_PATH}?wbtreeid=1001`,
    count: items.length,
    total: meta.total,
    total_pages: meta.totalPages,
    current_page: meta.currentPage || page,
    items,
  };
}

function parseSearchResults(html) {
  const items = [];
  const seen = new Set();

  const list = html.match(
    /<ul[^>]*class=["'][^"']*listg2412[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i
  );
  const chunk = list ? list[1] : html;

  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let li;

  while ((li = liRe.exec(chunk))) {
    const block = li[1];
    const hrefM = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i);
    if (!hrefM) continue;

    const href = decodeEntities(hrefM[1]);
    let abs;
    try {
      abs = new URL(href, SITE + "/").href;
    } catch {
      continue;
    }

    if (seen.has(abs)) continue;
    seen.add(abs);

    const titleM = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const dateM =
      block.match(
        /<(?:span|i|div)[^>]*class=["'][^"']*(?:date|date-list)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|i|div)>/i
      ) || block.match(/(\d{4}[-年]\d{1,2}[-月]\d{1,2}(?:日)?)/);

    const pM = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

    const title = strip(titleM ? titleM[1] : "").slice(0, 180);
    const date = strip(dateM ? dateM[1] : "");
    const snippet = strip(pM ? pM[1] : "").slice(0, 360);

    if (!title || title.length < 2) continue;

    const host = safeHost(abs);
    items.push({
      title,
      date,
      snippet,
      url: abs,
      path: abs.startsWith(SITE + "/") ? abs.slice((SITE + "/").length) : "",
      external: host !== "nic.xtu.edu.cn",
    });
  }

  return items.slice(0, 30);
}

function parsePagination(html) {
  const text = strip(
    (html.match(/<table[^>]*class=["']?listFrame["']?[^>]*>([\s\S]*?)<\/table>/i) ||
      [, ""])[1]
  );

  const totalM = text.match(/共有\s*(\d+)\s*条/);
  const pagesM = text.match(/共有\s*(\d+)\s*页/);
  const currentM = text.match(/当前第\s*(\d+)\s*页/);

  return {
    total: totalM ? Number(totalM[1]) : null,
    totalPages: pagesM ? Number(pagesM[1]) : null,
    currentPage: currentM ? Number(currentM[1]) : null,
  };
}

async function getArticle(input) {
  let target = input.trim();

  if (target.startsWith("/")) target = SITE + target;
  if (!/^https?:\/\//i.test(target)) {
    target = `${SITE}/${target.replace(/^\.\//, "")}`;
  }

  const url = new URL(target);
  if (url.hostname !== "nic.xtu.edu.cn") {
    throw new Error(
      "get_article 仅直接读取 nic.xtu.edu.cn 页面；搜索结果中的外部链接请由客户端直接打开。"
    );
  }

  const res = await fetch(target, {
    headers: {
      "User-Agent": UA,
      Referer: `${SITE}/`,
    },
  });

  if (!res.ok) throw new Error(`抓取失败 HTTP ${res.status}`);
  const html = await res.text();

  const title =
    extractArticleTitle(html) ||
    strip((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1])
      .replace(/[-_—|]?\s*湘潭大学网络与信息(?:管理)?中心.*$/i, "")
      .trim() ||
    target;

  const text = extractMain(html);
  const attachments = extractAttachments(html, target);

  return {
    title,
    url: target,
    chars: text.length,
    attachments,
    text: text.slice(0, 16000),
  };
}

function extractArticleTitle(html) {
  const patterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2[^>]*class=["'][^"']*(?:title|detail|article)[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i,
    /<div[^>]*class=["'][^"']*(?:detail-title|article-title|news-title)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const t = strip(m[1]);
      if (t.length >= 2 && t.length <= 220) return t;
    }
  }
  return "";
}

function extractAttachments(html, pageUrl) {
  const out = [];
  const seen = new Set();
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = re.exec(html))) {
    const href = decodeEntities(m[1]);
    const label = strip(m[2]);

    const isFile =
      /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|wps|txt)(?:$|[?#])/i.test(href) ||
      /__local\//i.test(href) ||
      /\/system\/resource\/attach\//i.test(href);

    if (!isFile) continue;

    let abs;
    try {
      abs = new URL(href, pageUrl).href;
    } catch {
      continue;
    }

    if (seen.has(abs)) continue;
    seen.add(abs);

    out.push({
      name: (label || abs.split("/").pop() || "附件").slice(0, 160),
      url: abs,
    });
  }

  return out;
}

function extractMain(html) {
  const candidates = [
    /<div[^>]*class=["'][^"']*v_news_content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)?/i,
    /<div[^>]*id=["']vsb_content[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>)?/i,
    /<div[^>]*class=["'][^"']*(?:detail-content|article-content|news-content|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<td[^>]*class=["'][^"']*(?:v_news_content|content)[^"']*["'][^>]*>([\s\S]*?)<\/td>/i,
  ];

  let chunk = html;
  for (const re of candidates) {
    const m = html.match(re);
    if (m && strip(m[1]).length > 100) {
      chunk = m[1];
      break;
    }
  }

  chunk = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");

  let text = decodeEntities(chunk);

  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  const drop = new Set([
    "首页",
    "中心概况",
    "规章制度",
    "网络动态",
    "用户服务",
    "快速通道",
    "信息安全",
    "常见问题",
    "下载专区",
    "党群工作",
    "联系我们",
    "湘潭大学",
  ]);

  const kept = [];
  for (const line of lines) {
    if (drop.has(line)) continue;
    if (/^Copyright\b/i.test(line)) break;
    if (/湘潭大学网络与信息中心版权所有/.test(line)) break;
    kept.push(line);
  }

  return kept.join("\n").trim();
}

function utf8Base64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function safeHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
    });
}

function strip(s) {
  return decodeEntities(
    String(s || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function acceptsEventStream(request) {
  const accept = request.headers.get("Accept") || "";
  return /text\/event-stream/i.test(accept);
}

function cors(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name, Last-Event-ID"
  );
  headers.set("Access-Control-Expose-Headers", "Mcp-Session-Id");
  return new Response(res.body, { status: res.status, headers });
}

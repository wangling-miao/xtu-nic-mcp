# 湘潭大学网络与信息中心 MCP

Cloudflare Worker 上的远程 MCP，用于检索湘潭大学网络与信息中心：

- 官网：https://nic.xtu.edu.cn/
- 官方站内搜索：`/search.jsp?wbtreeid=1001`
- 搜索关键词使用 UTF-8 Base64
- 首次搜索使用 POST
- 第 2 页及以后使用 `currentnum + newskeycode2`
- `searchScope=0`
- 不需要写入浏览器的 `JSESSIONID`

## MCP 工具

| 工具 | 说明 |
|---|---|
| `search_nic` | 搜索校园网、VPN、校园卡、邮箱、信息门户、网络安全等内容 |
| `get_article` | 抓取 nic.xtu.edu.cn 正文及附件 |
| `list_sections` | 返回常用栏目与服务入口 |

搜索结果中的外部网页（例如微信公众号文章）会正常返回 URL，并标记 `external: true`；`get_article` 只直接读取 `nic.xtu.edu.cn`，避免 Worker 被当成任意 URL 代理。

## 部署

```bash
npm i
npx wrangler login
npx wrangler deploy
```

## MCP 地址

```text
https://xtu-nic-mcp.<你的账号>.workers.dev/417e7515-b174-45ed-89c1-3838b6100cd7/mcp
```

UUID 可以在 `wrangler.toml` 中修改。

## 客户端配置

```json
{
  "mcpServers": {
    "xtu-nic": {
      "type": "http",
      "url": "https://xtu-nic-mcp.<你的账号>.workers.dev/417e7515-b174-45ed-89c1-3838b6100cd7/mcp"
    }
  }
}
```

Cherry Studio 使用 `streamableHttp`，Claude Code / VS Code 可使用 `http`。

## 自测

```bash
UUID=417e7515-b174-45ed-89c1-3838b6100cd7
BASE=https://xtu-nic-mcp.<你的账号>.workers.dev

curl -s "$BASE/health"

curl -s "$BASE/$UUID/mcp" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

# CS5351

## StudyPilot

StudyPilot is a study-planning application for the CS5351 Agentic Software Engineering project. Students manage courses, assignments, remaining effort and weekly availability in a browser workspace. A deterministic scheduler creates a seven-day plan in Hong Kong time, while optional AI advice can explain priorities without changing task facts or schedule blocks.

The application supports personal AI keys for CityU CSLab, OpenAI and DeepSeek, a separate operator-configured AI mode, versioned backups, calendar export, and previewed Canvas imports. Canvas personal-token connections are a controlled self-testing feature; a shared production application requires approved Canvas OAuth. Source code is under `src/`, with independent offline tests, fixed advice-boundary evaluation and opt-in live tests. Architecture and credential decisions are recorded in `docs/architecture/adr/002-verified-planning-and-personal-connections.md`.

## 中文使用指南

### 1. 已有功能和使用范围

- 新增、编辑和删除课程与任务，设置截止时间、剩余学习工时、优先级和完成状态。
- 按课程、状态和文字筛选任务；删除课程前确认关联任务的影响。
- 选择星期和学习时段，保存每周目标；所有截止输入、显示和排程统一使用香港时间。
- 生成未来七天的安排，避开过去时间和时间冲突，严格遵守具体截止时刻；排不下的工时会明确提示。
- 选择纯规则模式，或用自己的 AI 服务、模型和 API Key 获取建议；个人模式使用自己的服务额度。
- 在受控自测中读取自己的 Canvas 课程与作业，先预览再确认导入；支持示例数据和 Canvas JSON 导入。
- 在当前浏览器保存学习数据，下载/恢复 JSON 备份，导出当前有效计划为 `.ics` 日历文件。

这是设备本地工作区，不是云端账号系统。不同 Canvas 身份使用不同的本地工作区；没有跨设备同步，也没有学校 EID 密码登录表单。

### 2. 下载和启动

安装 [Git](https://git-scm.com/) 和 [Node.js](https://nodejs.org/)，Node.js 需为 **22.13 或更新版本**。源码仓库为 [Innoall/StudyPilot](https://github.com/Innoall/StudyPilot)，当前为私有仓库，访问和克隆需要获准的 GitHub 账号。

```sh
git clone https://github.com/Innoall/StudyPilot.git
cd StudyPilot
npm ci
npm run dev
```

打开 [本地网页](http://localhost:5173/)。保持启动终端运行，停止时按 `Ctrl + C`。如果手头是尚未推送的本地更新，先在该本地项目目录运行；远端仓库不会自动包含未推送代码。

上面是开发模式，默认端口为 5173。需要在普通本地副本运行构建后的生产服务器时，先构建再启动：

```sh
npm run build
npm start
```

生产模式使用终端显示的端口，普通副本默认是 3000，也可用 `npm start -- --port 3001` 指定。开发端口与生产端口不同。受管理的 Worker 构建继续使用对应的 Wrangler 启动方式，由项目运行配置选择；普通 GitHub 克隆不需要该托管环境。

macOS 也可在 Finder 中右键 `Start-StudyPilot.command`，选择 **Open（打开）**。脚本会检查 Node、安装缺失依赖、启动服务并打开网页。遇到权限问题可在项目目录运行一次：

```sh
chmod +x Start-StudyPilot.command
```

源码编辑入口是 `src/app/page.tsx`，在编辑器中应打开整个项目文件夹。

### 3. 手动录入并生成计划

1. 在 **Courses & tasks** 添加课程，再添加任务。
2. 填写 **Deadline (HKT)** 和 **Remaining hours**。工时是尚未完成的学习量，不是整个作业最初的总工时。
3. 在 **Availability** 修改星期与起止时间，并点击该行的 **Save**。同一天可以有多个时段，重叠部分不会重复计算容量。
4. 打开 **Study plan**，点击 **Generate / Regenerate**。
5. 查看学习时间块、建议和未排工时；完成任务后更新状态，再重新生成。

改动任务或空闲时间后，原计划会提示需要重新生成。没有未完成任务时，页面会引导先添加任务；无可用时间、已逾期或容量不足时，不会强行排到截止日期之后。单个学习块最多 90 分钟，块间保留 15 分钟休息。

### 4. 使用自己的 AI Key 和额度

打开 **Connections → AI adviser**：

1. 在 **Planning mode** 选择 **Use my own AI key and quota**。
2. 选择 **CityU CSLab / OpenAI / DeepSeek**。
3. 填入该服务实际授权的 **Model ID** 和自己的 **API key**。
4. 点击 **Apply AI settings**，再到学习计划页生成计划。应用设置本身不会发送 AI 请求。

服务地址采用固定预设，不能输入任意代理地址：CityU CSLab 为 `https://llm.cs.cityu.edu.hk/v1`；OpenAI 为 `https://api.openai.com/v1`；DeepSeek 为 `https://api.deepseek.com`。服务采用 Chat Completions 格式；OpenAI 模型需支持当前请求所用的消息和 JSON 输出参数。模型权限、可用额度和具体用量以自己的服务账户为准。[OpenAI 官方接口文档](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[DeepSeek 官方接入文档](https://api-docs.deepseek.com/en/)

个人 AI 调用失败时，只返回纯规则计划和明确状态，**不会改用服务器或别人的 Key 消费额度**。每次生成最多发送一次 AI 请求，不自动重试。选择 **Rule engine only · no AI cost** 不需要任何 AI Key，也不会调用 AI。

Key 只保留在当前页面内存和当次请求中，不写入浏览器本地存储、Cookie、备份或源码。刷新、关闭页面、清除 Key、切换 Canvas 身份或断开连接后需要重新输入。使用 **Clear my AI key** 可立即取消当前连接设置。

发给 AI 提供商的内容是 `Task 1 / Course 1` 等代号、截止时间、工时、优先级、状态、可用工时总量和固定偏好类别；不发送真实课程名称、任务标题、学生身份或原始自由文本目标。AI 提到的 Task 编号按未完成任务的截止时间排序。规则排程仍会处理全部任务，AI 上下文过大时只考虑最近的一部分任务并给出说明。

### 5. Canvas 个人自测与数据导入

**个人 Access Token 输入仅用于自己的受控开发自测。** Canvas 官方明确要求多人使用的应用通过 OAuth 获取用户授权，不能让其他用户手动生成 Token 后交给应用。正式共享部署仍需要学校批准的 Developer Key、OAuth 回调和服务端会话/令牌方案。[Canvas 官方说明：Manual Token Generation](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth#manual-token-generation)

本地开发自测时，在 **Connections → CityUHK Canvas** 输入自己的 Access Token，点击 **Connect and preview courses**。应用只读取当前用户资料、学生身份的有效课程、作业截止时间及自己的提交状态，不写回 Canvas。

成功后先核对预览，再 **Confirm import**。没有截止时间的项目会被提示并跳过，导入后请确认默认学习工时。再次同步会更新同一源记录的截止时间和提交状态，同时保留你自己设置的预计工时和优先级。

- Token 仅在当前页面内存和请求内使用，不保存到浏览器存储或服务器数据库；刷新后要重新输入。
- 连接到另一 Canvas 身份时切换到对应本地工作区，并清除原 AI Key 与旧请求结果。
- **Disconnect and clear keys** 清除当前页面的连接信息并返回手动工作区；已保存的学习数据仍保留在原工作区。
- **Remove imported data** 只删除当前工作区的 Canvas 来源数据，不修改学校 Canvas 记录，也不撤销学校后台的 Token。
- 没有可用 Token 或学校限制 Token 生成时，可使用 **Preview synthetic Canvas data** 或 **Import Canvas JSON**。示例数据会明确标为合成数据，不代表已连接真实账户。

生产环境默认关闭个人 Token 自测。部署者只有在已确认适用的受控测试范围后，才能设置 `CANVAS_PERSONAL_TOKEN_TESTING=true`。这不会把个人 Token 自测变成正式多人 OAuth 登录。默认服务地址为 `https://canvas.cityu.edu.hk`；额外服务主机只能由部署者通过 `CANVAS_ALLOWED_HOSTS` 明确配置，网页用户不能把服务器转向任意地址。

### 6. 保存、备份和日历

手动工作区沿用 `studypilot-data-v1`；Canvas 工作区使用服务端返回的身份摘要作为本地存储键。保存内容只有课程、任务、空闲时间和目标，连接 Key 与生成结果不属于持久化数据。

在 **Connections → Backups and sample data** 下载 JSON 备份。恢复备份时会先校验、显示预览，并要求确认替换当前工作区；损坏文件或不支持的版本不会覆盖原数据。文件上限为 2 MB。备份包含学习资料，请自行保存在合适位置。

在计划页下载 `.ics` 日历文件，可导入支持 iCalendar 的日历工具。导出使用香港时间并转义任务文字；修改数据后须重新生成有效计划再导出。

浏览器存储被清除、改用无痕窗口、换浏览器或换电脑后，数据不会自动同步。共用设备上的本地工作区隔离方便切换身份，不能替代操作系统账户隔离；共用电脑结束后应按需要清除网站学习数据并退出页面。

### 7. 可选的服务器学校 AI

一般用户可以直接使用个人 AI 模式，不需要修改服务器设置。部署者若希望提供独立的服务器学校 AI 模式，可在本地私有 `.env.local` 或部署平台私有变量中设置以下字段：

```text
SCHOOL_AI_BASE_URL=https://llm.cs.cityu.edu.hk/v1
SCHOOL_AI_MODEL=CS5351/DeepSeek-V4-Flash
SCHOOL_AI_API_KEY=由部署者在私有环境配置的授权Key
```

保存后重启服务。界面中必须明确选择 **Use the server's school AI configuration** 才会使用它，默认模式仍是纯规则。服务器地址也受支持的预设限制；不支持的配置会显示未配置状态。

共享服务器额度应配合部署身份验证、访问限制和额度管理；当前应用没有云账号与服务端计费账户系统。不要把真实值写进 `.env.example`、网页源码、截图、会话导出或 Git。此文档不会确认历史线上密钥是否仍有效。

### 8. 常见问题

**计划没有时间块。** 先检查未完成任务、剩余工时、精确截止时间和未来七天的学习时段。逾期任务不会被移到截止日期之后。

**AI 返回规则计划。** 查看 **AI status**：`unconfigured` 表示缺少配置，`unavailable` 表示服务或额度不可用，`timeout` 表示超时，`invalid-response` 表示回复不符合结构或安全要求。检查自己的模型权限和 Key 后重试；不要将 Key 或完整供应商错误贴入 issue。

**Canvas 按钮不可用。** 生产部署默认关闭 Token 自测。可运行本地开发副本，或由部署者按已确认的受控测试范围启用；正式多人使用需要 OAuth。

**Canvas 401 / 429 / timeout。** 分别检查 Token 有效性与权限、稍后重试、检查网络。失败不会应用部分导入。同步有分页、项目数和时间限制，超限时会明确提示。

**刷新后需要重新输入 Key。** 这是当前不持久化凭据的设计。课程任务可以保留，Key 不保留。

**Node 版本或端口问题。** 用 `node --version` 检查版本。若 5173 被占用，先确认是否已有本项目运行；在原终端停止旧服务后重新启动。

**浏览器无法保存。** 仍可在当前页面操作，但应先下载备份；关闭页面后未保存的变化可能丢失。数据恢复失败时，应用会提示并保留原始损坏记录，不会偷偷宣称恢复成功。

更新代码前先保存自己的改动，再执行 `git pull`、`npm ci` 和 `npm run dev`。若有冲突，先保留本地改动并解决冲突，不要直接删除文件。

## Architecture and repository map

- `src/app/page.tsx`: browser workspace, editing, connection state, import confirmation and stale-plan handling.
- `src/app/api/plan/route.ts`: private plan API with validated input and request-local AI configuration.
- `src/app/api/canvas/route.ts`: controlled self-testing readiness, verification and bounded read-only sync.
- `src/lib/planner.ts`, `src/lib/time.ts`: deterministic schedule and Hong Kong calendar arithmetic.
- `src/lib/data.ts`, `src/lib/canvas-data.ts`: validated study facts, backup/ICS export and idempotent Canvas normalization/merge.
- `src/lib/ai.ts`, `src/lib/canvas.ts`, `src/lib/provider-security.ts`: provider adapters and credential/network boundaries.
- `src/components/`, `src/hooks/`, `src/db/`: existing reusable components, hooks and the unused database scaffold. No persistent credential vault is implemented.
- `test/offline/`, `test/evaluation/`, `test/live/`: deterministic regression, fixed response-boundary evaluation and explicit live checks.
- `docs/req/`, `docs/architecture/`, `docs/code-governance/`: requirements, ADRs, traceability, permissions and verification rules.
- `prompts/`, `.github/workflows/ci.yml`: versioned prompt records and blocking gates.
- `AGENTS.md`, `Prompt.md`: coding-agent entry point and supervised execution workflow.

The browser owns device-local study facts. The rule planner owns schedule blocks. AI can replace only a bounded summary and three suggestions. All outbound credentials are constrained to selected HTTPS providers and are discarded after the request. Canvas profile identities become separate local workspace hashes, not server-side cloud accounts. See the architecture blueprint and ADR-002 for alternatives, consequences and reopening criteria.

## Verification and course engineering requirements

Run deterministic tests and fixed advice-boundary evaluations together:

```sh
npm test
```

Run the complete local structural, schema, static, regression, evaluation and build checks:

```sh
npm run verify
```

Individual checks are available as `npm run typecheck`, `npm run lint`, `npm run validate:req`, `npm run verify:structure`, `npm run test:offline`, `npm run test:evaluation` and `npm run build`.

```sh
npm run test:live
```

Live tests skip unless explicitly enabled with dedicated test credentials. Optional AI calls require `RUN_LIVE_TESTS=1`; required release validation uses `REQUIRE_LIVE_TESTS=1`, which fails if configuration is missing. Canvas uses separate `RUN_CANVAS_LIVE_TESTS` / `REQUIRE_CANVAS_LIVE_TESTS` flags, and full course sync requires an additional explicit opt-in. See `docs/testing.md` for exact variables, thresholds and the full suite instructions. Skips and synthetic responses are never counted as a successful real-model or real-Canvas evaluation.

The [2026-11-16 local validation record](docs/validation-evidence.md) reports a passing full verification run: 56 offline tests, 13 fixed evaluation/prompt-consistency tests and production build. Browser QA passed 13 scenarios at desktop and phone widths, with no page errors in the main flow; Canvas account-switch checks used synthetic intercepted responses. Six live tests explicitly skipped, and no real provider call was made. These results apply to the recorded local environment and do not establish remote integration or deployment status.

CI implements test approval, static/dependency/permission checks, actual requirements-schema validation, fixed AI boundary evaluation, regression and AI-use log gates. The test-approval verifier retrieves an independent GitHub review of a tests-only commit; a self-edited `approved` flag is insufficient. Real-provider evaluation runs separately in a protected environment before a release claims live support.

Branch protection, protected environment reviewers and independent GitHub review must still be configured and verified on the real repository. The local implementation does not establish that those settings are active or that the project is merge-ready. Browser acceptance results belong in the review evidence after they are actually run. Team contributions, the final process report and five annotated original transcripts are separate coursework deliverables and are deferred in the current project-only scope.

## Deployment status

The historical demonstration URL is [StudyPilot preview](https://studypilot-cityu.lixinzi666666.chatgpt.site/). This README does not claim that it contains the current local changes or that its credentials and provider access have been verified in this session. Validate the selected release commit, host access settings, HTTPS and required live integrations before publishing.

## 2026-11-16 visual refresh

The desktop and mobile interfaces now share a spacious midnight-blue workspace, a current-deadline focus card, clearer metrics, consistent task lists, refined schedule blocks and unified forms. This changes presentation while retaining the validated scheduling and credential boundaries.

The refresh passed 58 offline tests, 13 fixed AI/prompt evaluations, type/lint/schema/structural checks and production build. Actual production startup served HTTP 200 in the local verification. Responsive checks covered 1440px, 1920px and all five pages at 390px, including task editing and generation through the real rule API. External service calls were not part of this visual refresh.

If a macOS launcher downloaded from the GitHub web interface lacks executable permission, run `chmod +x Start-StudyPilot.command` once before opening it. Terminal startup with `npm ci` and `npm run dev` is also supported.

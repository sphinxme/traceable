# Feature Specification: 将NoteEditor中的Quill编辑器替换为TipTap编辑器

**Feature Branch**: `002-tiptap-editor`
**Created**: 2026-01-05
**Status**: Draft
**Input**: User description: "将NoteEditor中的Quill编辑器替换为TipTap编辑器"

## Clarifications

### Session 2026-01-05

- Q: 富文本功能范围 → A: 仅保留基础文本输入，不支持富文本工具栏和格式按钮
- Q: 资源清理策略 → A: 自动清理（onDestroy中调用editor.destroy()）
- Q: 冲突解决策略 → A: 依赖Yjs自动冲突解决，不考虑错误处理和协作问题，交由底层实现
- Q: 粘贴行为 → A: 使用TipTap默认行为（保留富文本格式）
- Q: 离线编辑策略 → A: 暂不考虑，断网和冲突问题交给Yjs底层处理
- Q: 数据平滑迁移 → A: 无需考虑旧数据情况, 仅考虑崭新使用

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 编辑器基本功能替换 (Priority: P1)

作为用户，我希望在任务备注编辑时使用TipTap编辑器，以便获得更好的编辑体验和协作功能。

**Why this priority**: 这是核心功能替换，所有用户都会直接受到影响，必须确保基本功能完整。

**Independent Test**: 可以通过打开任务备注编辑器，输入文本，验证文本正确保存和显示来进行测试。

**Acceptance Scenarios**:

1. **Given** 用户打开任务备注编辑弹窗，**When** 页面加载完成，**Then** TipTap编辑器正确渲染并可正常输入文本
2. **Given** 用户在编辑器中输入文本，**When** 文本输入完成，**Then** 文本内容正确同步到Yjs共享状态
3. **Given** 用户在多个窗口打开同一个备注，**When** 在一个窗口编辑文本，**Then** 其他窗口实时显示更新内容

---

### User Story 2 - Shift+Enter关闭编辑器 (Priority: P1)

作为用户，我希望通过Shift+Enter快捷键关闭编辑器，以便快速保存并返回任务列表。

**Why this priority**: 这是当前Quill编辑器保留的关键交互行为，用户已习惯此操作，必须保持一致。

**Independent Test**: 可以在编辑器中按Shift+Enter，验证弹窗是否正确关闭。

**Acceptance Scenarios**:

1. **Given** 用户正在编辑备注，**When** 按下Shift+Enter组合键，**Then** 编辑弹窗关闭
2. **Given** 用户按下Enter键（无Shift），**Then** 在编辑器中插入换行符，不关闭弹窗

---

### User Story 3 - 纯文本编辑 (Priority: P2)

作为用户，我希望在备注中输入纯文本内容，以便快速记录想法。

**Why this priority**: 简化编辑器功能，专注于核心文本编辑体验。

**Independent Test**: 可以在编辑器中输入文本，验证内容正确保存。

**Acceptance Scenarios**:

1. **Given** 用户在编辑器中输入文本，**When** 输入完成，**Then** 文本正确保存到Yjs状态
2. **Given** 用户粘贴内容，**Then** 内容正确插入，遵循TipTap默认粘贴行为

---

### User Story 4 - 编辑器焦点管理 (Priority: P2)

作为用户，我希望编辑器能够正确处理焦点，以便通过编程方式聚焦编辑器。

**Why this priority**: NoteEditor组件导出了focus方法，其他组件可能依赖此功能。

**Independent Test**: 可以调用editor.focus()方法，验证编辑器是否获得焦点。

**Acceptance Scenarios**:

1. **Given** 编辑器已加载，**When** 调用focus方法，**Then** 编辑器获得输入焦点

---

### Edge Cases

- 当编辑器组件卸载时，如何正确清理TipTap资源和事件监听器？
- 当Y.Text共享状态被替换时，编辑器如何正确更新内容？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须使用TipTap编辑器替代Quill编辑器处理任务备注内容
- **FR-002**: TipTap编辑器必须与Yjs的Y.Text类型正确绑定，实现实时协作编辑
- **FR-003**: 系统必须保留Shift+Enter快捷键关闭编辑弹窗的行为
- **FR-004**: 用户必须能够在备注中输入纯文本内容
- **FR-005**: 组件必须导出focus方法，支持编程式聚焦编辑器
- **FR-006**: 组件卸载时必须正确清理TipTap编辑器和Yjs绑定资源，防止内存泄漏

### Key Entities

- **NoteEditor**: Svelte组件，负责渲染TipTap编辑器并处理用户交互
- **Y.Text**: Yjs的文本类型，用于存储和同步备注内容
- **TipTap Editor**: 核心编辑器实例，管理文档模型和用户输入

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户可以在任务备注中正常输入和编辑文本，保存成功率100%
- **SC-002**: Shift+Enter快捷键关闭编辑器的响应时间小于100毫秒
- **SC-003**: 多用户协作编辑时，文本同步延迟小于500毫秒（由Yjs保证）
- **SC-004**: 编辑器加载时间小于1秒（首次渲染）
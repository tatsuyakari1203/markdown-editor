# Demo Markdown với Table of Contents và Wiki Links

## Table of Contents

## Giới thiệu

Đây là một demo để test các tính năng mới:
- Table of Contents tự động
- Wiki Links
- Heading anchors

## Tính năng Table of Contents

Table of Contents sẽ được tự động tạo từ các headings trong document. Plugin `remark-toc` sẽ tìm heading "Table of Contents" và thay thế bằng danh sách các headings.

## Wiki Links

Bạn có thể sử dụng wiki links như sau:

- [[Existing Page]] - Link đến trang có sẵn
- [[New Page]] - Link đến trang chưa tồn tại
- [[Real Page:Page Alias]] - Link với alias

### Ví dụ Wiki Links

- [[Home]] - Trang chủ
- [[Documentation]] - Tài liệu
- [[API Reference:API Docs]] - Tài liệu API với alias
- [[Non Existent Page]] - Trang chưa tồn tại

## Heading Anchors

Mỗi heading sẽ có anchor link. Hover vào heading để thấy ký tự `#`.

### Sub Heading 1

Nội dung của sub heading 1.

### Sub Heading 2

Nội dung của sub heading 2.

#### Sub Sub Heading

Nội dung của sub sub heading.

## Code Examples

```javascript
// Example JavaScript code
function generateTOC(markdown) {
  const headings = markdown.match(/^#{1,6}\s+.+$/gm);
  return headings.map(heading => {
    const level = heading.match(/^#+/)[0].length;
    const text = heading.replace(/^#+\s+/, '');
    return { level, text };
  });
}
```

```python
# Example Python code
def generate_toc(markdown):
    import re
    headings = re.findall(r'^#{1,6}\s+.+$', markdown, re.MULTILINE)
    return [{
        'level': len(heading.split()[0]),
        'text': ' '.join(heading.split()[1:])
    } for heading in headings]
```

## Kết luận

Demo này cho thấy các tính năng:
1. ✅ Table of Contents tự động
2. ✅ Wiki Links với styling khác nhau cho existing/new pages
3. ✅ Heading anchors với hover effect
4. ✅ Code syntax highlighting
5. ✅ Dark/Light mode support

Tất cả các tính năng đều hoạt động với dark mode và light mode.
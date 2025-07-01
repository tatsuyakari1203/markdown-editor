# Test Tabs Persistence

Đây là file test để kiểm tra tính năng lưu trữ tabs.

## Các bước test:

1. Mở ứng dụng
2. Tạo nhiều tabs mới
3. Nhập nội dung khác nhau vào mỗi tab
4. Refresh trình duyệt
5. Kiểm tra xem tất cả tabs và nội dung có được khôi phục không

## Kết quả mong đợi:

- Tất cả tabs được khôi phục
- Nội dung của mỗi tab được giữ nguyên
- Tab đang active được khôi phục đúng
- Trạng thái isDirty được reset về false sau khi lưu

## Cải tiến đã thực hiện:

1. **LocalStorageStrategy**: Thêm hỗ trợ lưu trữ nhiều tabs
2. **TabManagerContext**: Cập nhật logic load/save tabs
3. **Auto-save**: Lưu cả structure và content của tabs
4. **Persistence**: Tabs được lưu khi có thay đổi structure hoặc content
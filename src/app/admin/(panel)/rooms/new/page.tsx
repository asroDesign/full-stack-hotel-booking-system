import { PageHeader } from "@/components/admin/ui";
import { RoomForm } from "@/components/admin/rooms-admin";

export default function NewRoom() {
  return (
    <div>
      <PageHeader title="افزودن اتاق جدید" desc="مشخصات کامل، تصاویر و ویدیوی اتاق را وارد کنید." />
      <RoomForm />
    </div>
  );
}

import { PageHeader } from "@/components/admin/ui";
import { ServiceForm } from "@/components/admin/services-admin";

export default function NewService() {
  return (
    <div>
      <PageHeader title="افزودن خدمت جدید" />
      <ServiceForm />
    </div>
  );
}

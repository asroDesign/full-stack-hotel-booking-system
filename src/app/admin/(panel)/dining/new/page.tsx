import { PageHeader } from "@/components/admin/ui";
import { VenueForm } from "@/components/admin/dining-admin";

export default function NewVenue() {
  return (
    <div>
      <PageHeader title="رستوران / کافه جدید" desc="پس از ذخیره، منو را اضافه کنید." />
      <VenueForm />
    </div>
  );
}

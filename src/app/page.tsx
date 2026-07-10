import RecordScreen from "@/components/RecordScreen";

export default async function RecordPage(props: PageProps<"/">) {
  const { date } = await props.searchParams;
  return <RecordScreen dateParam={typeof date === "string" ? date : undefined} />;
}
import Link from "next/link";
import { MagnifyingGlass } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return <EmptyState icon={MagnifyingGlass} eyebrow="404 · Not found" title="We could not find that survey page" description="The property, flat, element, or report may have been archived, removed, or entered incorrectly." tips={["Check the URL and try again.", "Use the dashboard or properties list to reopen the current survey context."]} action={<Link href="/dashboard"><Button>Back to dashboard</Button></Link>} />;
}

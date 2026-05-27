import BrowserOnly from "@docusaurus/BrowserOnly";
import Head from "@docusaurus/Head";
import { AdminApp } from "../../components/admin/AdminApp";
import "../../css/admin.css";

export default function AdminPage() {
  return (
    <>
      <Head>
        <title>Admin · ひかりの備忘録</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <BrowserOnly fallback={<div className="admin-loading">Loading editor...</div>}>
        {() => <AdminApp />}
      </BrowserOnly>
    </>
  );
}

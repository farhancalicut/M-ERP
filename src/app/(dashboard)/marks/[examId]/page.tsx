import nextDynamic from 'next/dynamic';

export const dynamic = 'force-static';

const Page = nextDynamic(() => import('./_client'), { ssr: false });

export function generateStaticParams() {
  return [{ examId: '_' }];
}

export default Page;

This is a [Next.js](https://nextjs.org) frontend workspace for the EPPLMS project.

## Getting Started

Requirements:

- Node.js >= 20
- pnpm

Install packages:

```bash
npm install -g pnpm
pnpm install
pnpm lefthook install
```

Run the development server from the repository root:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The web app lives in `apps/web`. Start editing from `apps/web/src/app`.

By default, the frontend proxies backend traffic through these environment variables:

- `NEXT_PUBLIC_USER_SERVICE_URL`
- `NEXT_PUBLIC_COURSE_SERVICE_URL`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

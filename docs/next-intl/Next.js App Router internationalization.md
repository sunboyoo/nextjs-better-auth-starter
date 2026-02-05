https://next-intl.dev/docs/getting-started/app-router

Next.js App Router internationalization (i18n)
Prefer to watch a video?

Set up next-intl
Getting started
If you haven’t done so already, create a Next.js app that uses the App Router and run:

npm install next-intl

Now, we’re going to create the following file structure:

├── messages
│   ├── en.json
│   └── ...
├── next.config.ts
└── src
    ├── i18n
    │   └── request.ts
    └── app
        ├── layout.tsx
        └── page.tsx

Let’s set up the files:

messages/en.json
Messages represent the translations that are available per language and can be provided either locally or loaded from a remote data source.

The simplest option is to add JSON files in your local project folder:

messages/en.json
{
  "HomePage": {
    "title": "Hello world!"
  }
}

i18n/request.ts
next-intl creates a request-scoped configuration object, which you can use to provide messages and other options based on the user’s locale to Server Components.

src/i18n/request.ts
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async () => {
  // Static for now, we'll change this later
  const locale = 'en';
 
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

next.config.ts
Now, set up the plugin which links your i18n/request.ts file to next-intl.

next.config.ts
import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
 
const nextConfig: NextConfig = {};
 
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);

app/layout.tsx
To make your request configuration available to Client Components, you can wrap the children in your root layout with NextIntlClientProvider.

app/layout.tsx
import {NextIntlClientProvider} from 'next-intl';
 
type Props = {
  children: React.ReactNode;
};
 
export default async function RootLayout({children}: Props) {
  return (
    <html>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

app/page.tsx
Use translations in your page components or anywhere else!

app/page.tsx
import {useTranslations} from 'next-intl';
 
export default function HomePage() {
  const t = useTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}

In case of async components, you can use the awaitable getTranslations function instead:

app/page.tsx
import {getTranslations} from 'next-intl/server';
 
export default async function HomePage() {
  const t = await getTranslations('HomePage');
  return <h1>{t('title')}</h1>;
}

Next steps
Locale-based routing
If you’d like to use unique pathnames for every language that your app supports (e.g. /en/about or example.de/über-uns), you can continue to set up a top-level [locale] segment for your app.

Set up locale-based routing
→
Provide a locale
If your app doesn’t require unique pathnames per locale, you can provide a locale to next-intl based on user preferences or other application logic.

The simplest option is to use a cookie:

src/i18n/request.ts
import {cookies} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get('locale')?.value || 'en';
 
  return {
    locale
    // ...
  };
});

Internationalization isn’t just translating words
next-intl provides the essential foundation for internationalization in Next.js apps. It handles aspects like translations, date and number formatting, as well as internationalized routing.
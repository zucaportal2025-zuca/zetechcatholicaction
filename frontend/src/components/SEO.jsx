import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_NAME = "Zetech University Catholic Action (ZUCA)";
const BASE_URL = "https://zetechcatholicaction.com";
const DEFAULT_IMAGE = `${BASE_URL}/zuca-logo.png`;

const seoRoutes = {
  "/": {
    title: "Official Zetech University Catholic Action (ZUCA) Club Portal",
    description:
      "Official Zetech University Catholic Action (ZUCA) portal.Zetech Catholic Action is a vibrant student group committed to evangelism, faith, and fellowship through music and action. Our mission is to spread the message of hope, love, and faith within our campus community and beyond. Our songs will be an  expression of our devotion and a call to all to embrace Gods grace follow us in our social media! ON Tiktok...https://www.tiktok.com/@zetechcatholicaction?_t=ZM-8yeypKK8YpM&_r=1INSTAGRAM ...https://www.instagram.com/zetechcatholicaction?igsh=d211Y2htZW9qbGU3 ......FACEBOOK https://www.facebook.com/share/1ELDK56qEJ/.....Our website... Https://zetechcatholicaction.com also Access announcements, Mass schedules, prayers, hymns, leadership information, events and more.",
  },

  "/liturgical-calendar": {
    title: "Catholic Liturgical Calendar | Zetech University Catholic Action (ZUCA)",
    description:
      "View the Catholic liturgical calendar, feast days, liturgical colours and daily Mass readings.",
  },

  "/gallery": {
    title: "Gallery | Zetech University Catholic Action (ZUCA)",
    description:
      "Browse photos and videos from Zetech University Catholic Action (ZUCA) events.",
  },

  "/user-manual": {
    title: "User Manual | Zetech University Catholic Action (ZUCA)",
    description:
      "Learn how to use the Zetech University Catholic Action (ZUCA) Portal.",
  },

  "/prayer": {
    title: "Prayer | Zetech University Catholic Action (ZUCA)           ",
    description:
      "Catholic prayers and spiritual resources.",
  },

  "/hymns": {
    title: "ZUCA Catholic Hymn Book | Zetech Catholic Action",
    description:
      "Browse Catholic hymns and lyrics.",
  },

  "/login": {
    title: "Login | Zetech Catholic Action",
    description:
      "Login to your Zetech Catholic Action account.",
  },

  "/register": {
    title: "Register | Zetech Catholic Action",
    description:
      "Create your Zetech Catholic Action account.",
  },
};

export default function SEO() {
  const { pathname } = useLocation();
  const isDynamicPage =
  pathname.startsWith("/hymn/") ||
  pathname.startsWith("/readings/") ||
  pathname.startsWith("/jumuia/");

  const seo =
    seoRoutes[pathname] || {
      title: SITE_NAME,
      description: "Official Zetech Catholic Action website.",
    };

  const url = BASE_URL + pathname;
  if (isDynamicPage) return null;

  return (
    <Helmet>
      {/* Primary SEO */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta
        name="keywords"
        content="Zetech Catholic Action, ZUCA, Zetech University, Catholic Club, Kenya, Liturgical Calendar, Hymns, Prayer"
      />
      <meta name="author" content="Zetech Catholic Action" />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#ffffff" />

      {/* Canonical */}
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={DEFAULT_IMAGE} />
      <meta property="og:image:alt" content="Zetech Catholic Action Logo" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={DEFAULT_IMAGE} />
    </Helmet>
  );
}
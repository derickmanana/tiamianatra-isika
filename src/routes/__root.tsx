import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import "@/lib/i18n";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "M'BossTsika" },
      { name: "description", content: "Plateforme de formations vidéo en ligne organisées par modules. By Rasolonjatovo Jean Noël" },
      { property: "og:title", content: "M'BossTsika" },
      { name: "twitter:title", content: "M'BossTsika" },
      { property: "og:description", content: "Plateforme de formations vidéo en ligne organisées par modules. By Rasolonjatovo Jean Noël" },
      { name: "twitter:description", content: "Plateforme de formations vidéo en ligne organisées par modules. By Rasolonjatovo Jean Noël" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2PToPyxmoecXc1Y0ESb3nOTmgv72/social-images/social-1781546256785-1000047976.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/2PToPyxmoecXc1Y0ESb3nOTmgv72/social-images/social-1781546256785-1000047976.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "icon", href: "/icon-512.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center"><p>404</p></div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

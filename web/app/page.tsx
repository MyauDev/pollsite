'use client';
import Feed from '@/components/Feed';

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="text-center py-12 px-4 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent rounded-3xl blur-3xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-500 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Polls
          </h1>
          <p className="text-zinc-300 text-xl mb-3 font-medium">
            TikTok‑лента опросов
          </p>
          <p className="text-zinc-400 text-base max-w-sm mx-auto leading-relaxed">
            Голосуй одним тапом и сразу смотри результат. Создавай свои опросы.
          </p>
          
          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="relative z-10">
        <Feed />
      </div>
    </div>
  );
}
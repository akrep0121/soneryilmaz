'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div>
      {/* Mevcut index.html içeriğini buraya ekleyeceğiz */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Next.js Projesi Hazır</h1>
          <p className="text-gray-600 mb-4">Mevcut site kodları Next.js'e yükleniyor...</p>
          <Link href="https://soneryilmaz.vercel.app" className="text-blue-500 hover:underline">
            Mevcut Siteyi Ziyaret Et
          </Link>
        </div>
      </div>
    </div>
  );
}

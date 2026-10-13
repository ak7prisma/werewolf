import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center">
      <SectionTitle>Halaman Tidak Ditemukan</SectionTitle>
      <Subtitle>Malam ini tidak ada apa-apa di sini.</Subtitle>
      <Button asChild block>
        <Link to="/">
          <Home />
          Kembali ke Permainan
        </Link>
      </Button>
    </section>
  );
}

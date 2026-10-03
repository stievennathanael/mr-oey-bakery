'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion' // Import Framer Motion
import {
  Wheat,
  ChefHat,
  Heart,
} from 'lucide-react'
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'

export default function HomeScreen() {
  const router = useRouter()

  const handleClickWA = () => {
    const phone = '628978544484'
    const message = encodeURIComponent(
      'Halo, saya tertarik dengan produk Anda!'
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const handleClickIG = () => {
    window.open('https://instagram.com/rotioeysmg', '_blank')
  }

  return (
    <div className="flex flex-col w-full overflow-x-hidden bg-white">

      {/* HERO SECTION */}
      <section className="relative isolate min-h-[100svh] w-full overflow-hidden">

        {/* Background */}
        <Image
          src="/mainbg2.jpg"
          alt="Banner"
          fill
          priority
          className="object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 z-10" />

        {/* Content */}
        <div className="relative z-20 flex min-h-[100svh] items-center justify-center px-4 py-28 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-4xl text-center"
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-[4px] text-orange-500 sm:mb-6 sm:text-sm sm:tracking-[6px]">
              Selamat Datang di Toko Kami
            </p>
            <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl md:mb-8 md:text-7xl">
              Mr. Oey Bakery
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-200 sm:text-lg md:text-2xl">
              Dipanggang Setiap Hari Dengan Bahan Berkualitas Terbaik
            </p>

            <div className="mt-10 flex flex-col justify-center gap-4 sm:mt-12 sm:flex-row sm:gap-5">
              <button
                type="button"
                onClick={() => router.push('/menu')}
                aria-label="Go to Menu Page"
                title="Go to Menu Page"
                className="rounded-full bg-orange-500 px-8 py-4 font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-orange-600"
              >
                Produk Kami
              </button>
              
              <button
                type="button"
                onClick={() => router.push('/location')}
                aria-label="Go to Location Page"
                title="Go to Location Page"
                className="rounded-full border border-white px-8 py-4 font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white hover:text-black"
              >
                Lokasi Kami
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24">
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* IMAGE */}
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >

            {/* Main Image */}
            <div className="relative h-[340px] overflow-hidden rounded-3xl shadow-2xl sm:h-[480px] lg:h-[600px] lg:rounded-[32px]">
              <Image
                src="/bgsecond.jpg"
                alt="Bakery"
                fill
                className="object-cover hover:scale-105 transition-all duration-700"
              />
            </div>

            {/* Floating Card */}
            <div className="absolute -bottom-8 right-4 rounded-2xl border border-orange-100 bg-white px-5 py-4 shadow-2xl sm:-bottom-10 sm:-right-6 sm:rounded-3xl sm:px-8 sm:py-6">
              <h3 className="text-2xl font-bold text-orange-500 sm:text-4xl">
                Sejak 2019
              </h3>
            </div>
          </motion.div>

          {/* CONTENT */}
          <motion.div
            initial={{ opacity: 0, x: 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-[4px] text-orange-500 sm:tracking-[5px]">
              Cerita Kami
            </p>

            <h2 className="mb-6 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:mb-8">
              Perjalanan Toko Roti Lokal Menuju Cita Rasa Premium
            </h2>

            <div className="space-y-5 text-base leading-relaxed text-gray-900 sm:text-lg lg:text-justify">

              <p>
                Mr. Oey merupakan brand kuliner lokal yang lahir dari
                kecintaan terhadap warisan budaya dan cita rasa klasik.
                Nama "Oey" diambil dari marga "Oei" sebagai simbol
                tradisi, keluarga, dan kehangatan.
              </p>

              <p>
                Perjalanan kami dimulai dari produk bakpao yang dipasarkan
                melalui kerja sama dengan rumah sakit seperti RS
                Pantiwilasa Dr. Cipto dan RS Pantiwilasa Citarum.
              </p>

              <p>
                Saat pandemi COVID-19, Mr. Oey mulai berkembang melalui
                platform digital seperti GoFood dan GrabFood sehingga
                pelanggan dapat menikmati produk kami dengan lebih mudah.
              </p>

              <p>
                Kini, Mr. Oey berkembang menjadi bakery modern dengan
                berbagai pilihan cake & bakery premium yang dibuat
                menggunakan bahan berkualitas terbaik.
              </p>

            </div>

            {/* Stats */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:mt-12">

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 shadow-lg sm:rounded-3xl sm:p-8">
                <h3 className="text-4xl font-bold text-orange-500 sm:text-5xl">
                  4
                </h3>
                <p className="text-gray-900 mt-3">
                  Mitra Reseller
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 shadow-lg sm:rounded-3xl sm:p-8">
                <h3 className="text-4xl font-bold text-orange-500 sm:text-5xl">
                  1
                </h3>
                <p className="text-gray-900 mt-3">
                  Gerai Roti & Kue
                </p>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-[#FFF7F2] px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24">
        <div className="max-w-6xl mx-auto">

          <div className="mb-12 text-center sm:mb-16 lg:mb-20">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[4px] text-orange-500 sm:tracking-[5px]">
              Mengapa Memilih Kami
            </p>

            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
              Dibuat Dengan Kualitas Terbaik
            </h2>
          </div>

          <div className="mx-auto mb-4 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-10">

            {/* CARD 1 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="rounded-3xl bg-white p-6 text-center shadow-xl transition-all duration-300 sm:p-8 lg:p-10"
            >
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-orange-100 p-5">
                  <Wheat
                    size={50}
                    className="text-orange-500"
                  />
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Segar Setiap Hari
              </h3>

              <p className="text-gray-900 leading-relaxed">
                Semua produk dibuat fresh setiap hari dengan kualitas terbaik.
              </p>
            </motion.div>

            {/* CARD 2 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="rounded-3xl bg-white p-6 text-center shadow-xl transition-all duration-300 sm:p-8 lg:p-10"
            >
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-orange-100 p-5">
                  <ChefHat
                    size={50}
                    className="text-orange-500"
                  />
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Bahan Premium Pilihan
              </h3>

              <p className="text-gray-900 leading-relaxed">
                Menggunakan bahan pilihan untuk menghasilkan rasa autentik.
              </p>
            </motion.div>

            {/* CARD 3 */}
            <motion.div
              whileHover={{ y: -10 }}
              className="rounded-3xl bg-white p-6 text-center shadow-xl transition-all duration-300 sm:p-8 lg:p-10"
            >
              <div className="mb-6 flex justify-center">
                <div className="rounded-full bg-orange-100 p-5">
                  <Heart
                    size={50}
                    className="text-orange-500"
                    fill="currentColor"
                  />
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Dibuat Sepenuh Hati
              </h3>
              
              <p className="text-gray-900 leading-relaxed">
                Dibuat dengan dedikasi dan passion dalam setiap prosesnya.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="relative isolate overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:py-32">

        {/* Background */}
        <Image
          src="/mainbg2.jpg"
          alt="CTA"
          fill
          className="object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/75 z-10" />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative z-20 mx-auto max-w-4xl text-center text-white"
        >
          <p className="mb-5 text-sm font-semibold uppercase tracking-[4px] text-orange-500 sm:tracking-[5px]">
            Roti Segar dari Oven Setiap Hari
          </p>

          <h2 className="mb-6 text-3xl font-bold leading-tight sm:text-4xl md:mb-8 md:text-6xl">
            Nikmati Kehangatan Dalam Setiap Gigitan
          </h2>

          <p className="mb-8 text-base leading-relaxed text-gray-200 sm:text-lg lg:mb-10">
            Temukan berbagai pilihan produk yang tersedia di Mr. Oey Bakery
          </p>

          <button
            onClick={handleClickWA}
            className="rounded-full bg-orange-500 px-8 py-4 font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-orange-600 sm:px-10 sm:py-5 sm:text-lg"
          >
            Order Via WhatsApp
          </button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 bg-[#1A1A1A] px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-20 lg:py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-14">
          
          {/* BRAND */}
          <div>
            <h2 className="text-3xl font-bold mb-6">
              Mr. Oey Bakery
            </h2>
            <p className="leading-relaxed">
              Dipanggang Setiap Hari Dengan Sepenuh Hati Untuk
              Menghadirkan Kualitas Terbaik Dalam Setiap Gigitan
            </p>
          </div>

          {/* EXPLORE */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Eksplor
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="/" className="hover:text-orange-400 transition-all">
                  Beranda
                </a>
              </li>
              <li>
                <a href="/menu" className="hover:text-orange-400 transition-all">
                  Produk
                </a>
              </li>
              <li>
                <a href="/location" className="hover:text-orange-400 transition-all">
                  Lokasi
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-orange-400 transition-all">
                  Tentang Kami
                </a>
              </li>
            </ul>
          </div>

          {/* INFORMATION */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Informasi
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="/faqs" className="hover:text-orange-400 transition-all">
                  FAQs
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-orange-400 transition-all">
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-orange-400 transition-all">
                  Syarat & Ketentuan
                </a>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h3 className="text-xl font-semibold mb-6">
              Kontak
            </h3>
            <div className="space-y-5">
              <button
                onClick={handleClickWA}
                className="flex items-center gap-3 hover:text-orange-400 transition-all"
              >
                <FaWhatsapp size={24} />
                <span>+62 897 8544 484</span>
              </button>
              <button
                onClick={handleClickIG}
                className="flex items-center gap-3 hover:text-orange-400 transition-all"
              >
                <FaInstagram size={24} />
                <span>rotioeysmg</span>
              </button>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-white/10 mt-16 pt-8 text-center">
          © {new Date().getFullYear()} Mr. Oey Bakery.
          All Rights Reserved.
        </div>
      </footer>
    </div>
  )
}

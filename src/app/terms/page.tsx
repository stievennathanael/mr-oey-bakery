'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  FileText,
  CreditCard,
  RefreshCcw,
  ShoppingBag,
  PackageCheck,
  Shield,
} from 'lucide-react'

import {
  FaWhatsapp,
  FaInstagram,
} from 'react-icons/fa'

export default function TermsPage() {

  const handleScroll = () => {
    document
      .getElementById('terms-content')
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }

  const handleClickWA = () => {
    const phone = '628978544484'

    const message =
      encodeURIComponent(
        'Halo, saya ingin bertanya mengenai Syarat & Ketentuan Mr. Oey Bakery.'
      )

    window.open(
      `https://wa.me/${phone}?text=${message}`,
      '_blank'
    )
  }

  const handleClickIG = () => {
    window.open(
      'https://instagram.com/rotioeysmg',
      '_blank'
    )
  }

  return (
    <main className="overflow-x-hidden bg-white">

      {/* ====================================== */}
      {/* HERO */}
      {/* ====================================== */}

      <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-28 sm:px-6">

        <Image
          src="/mainbg2.jpg"
          alt="Terms & Conditions"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/65" />

        <motion.div
          initial={{
            opacity: 0,
            y: 70,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.9,
          }}
          className="relative z-10 mx-auto max-w-4xl text-center"
        >

          <p className="mb-5 text-xs font-semibold uppercase tracking-[4px] text-orange-500 sm:mb-6 sm:text-sm sm:tracking-[6px]">
            Informasi
          </p>

          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Syarat & Ketentuan
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-gray-200 sm:mt-8 sm:text-lg md:text-xl">
            Seluruh penggunaan website,
            layanan, pemesanan produk,
            pembayaran, hingga pengambilan
            pesanan di Mr. Oey Bakery
            mengikuti syarat dan ketentuan
            yang berlaku.
          </p>

          <button
            onClick={handleScroll}
            className="
              mt-10
              inline-flex
              items-center
              gap-3
              rounded-full
              bg-orange-500
              px-6
              py-4
              font-semibold
              text-white
              shadow-xl
              transition-all
              duration-300
              hover:scale-105
              hover:bg-orange-600
            "
          >
            Lihat Syarat & Ketentuan
            <ArrowDown size={20} />
          </button>

        </motion.div>

      </section>

      {/* ====================================== */}
      {/* CONTENT */}
      {/* ====================================== */}

      <section
        id="terms-content"
        className="
          relative
          overflow-hidden
          bg-white
          px-4
          py-16
          sm:px-6
          sm:py-20
          lg:px-20
          lg:py-24
        "
      >

        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-orange-100 opacity-50 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-200 opacity-40 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl">

          <motion.div
            initial={{
              opacity: 0,
              y: 40,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
            }}
            viewport={{
              once: true,
            }}
            className="mb-12 text-center sm:mb-16 lg:mb-20"
          >

            <p className="text-sm font-semibold uppercase tracking-[4px] text-orange-500 sm:tracking-[5px]">
              Syarat & Ketentuan
            </p>

            <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Ketentuan Penggunaan
              Layanan
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-900 sm:mt-6 sm:text-lg">
              Dengan menggunakan website
              Mr. Oey Bakery, melakukan
              registrasi akun, maupun
              melakukan pemesanan produk,
              Anda dianggap telah membaca,
              memahami, dan menyetujui
              seluruh syarat serta
              ketentuan berikut.
            </p>

          </motion.div>

          {/* ====================================== */}
          {/* CARD GRID */}
          {/* ====================================== */}

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">

            <motion.div
              whileHover={{
                y: -8,
              }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <FileText
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Penggunaan Layanan
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Layanan Mr. Oey Bakery digunakan untuk pemesanan produk bakery.',
                  'Pengguna wajib memberikan data yang benar saat registrasi.',
                  'Pengguna bertanggung jawab atas keamanan akun masing-masing.',
                  'Penyalahgunaan layanan dapat mengakibatkan pembatasan akses.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <FileText
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <ShoppingBag
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Pemesanan Produk
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Pesanan diproses setelah checkout berhasil.',
                  'Ketersediaan produk bergantung pada stok.',
                  'Harga yang berlaku adalah harga saat checkout.',
                  'Nomor invoice diterbitkan setelah pesanan dibuat.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ShoppingBag
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <CreditCard
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Pembayaran
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Pembayaran dilakukan melalui Midtrans.',
                  'Pesanan akan diproses setelah pembayaran berhasil.',
                  'Batas waktu pembayaran mengikuti ketentuan Midtrans.',
                  'Pesanan yang tidak dibayar akan otomatis dibatalkan.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CreditCard
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <PackageCheck
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Pengambilan Pesanan
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Pesanan diambil sesuai lokasi yang dipilih.',
                  'Pastikan nomor invoice sesuai saat pengambilan.',
                  'Pesanan yang telah diterima tidak dapat dikembalikan.',
                  'Hubungi kami apabila terjadi kendala.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <PackageCheck
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Shield
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Tanggung Jawab Pengguna
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Menjaga kerahasiaan akun.',
                  'Tidak memberikan informasi palsu.',
                  'Tidak menyalahgunakan layanan.',
                  'Mematuhi seluruh syarat yang berlaku.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Shield
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ y: -8 }}
              className="
                rounded-3xl
                border
                border-orange-100
                bg-white
                p-6
                shadow-xl
                sm:p-8
              "
            >
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <RefreshCcw
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Perubahan Ketentuan
              </h3>

              <ul className="space-y-4 text-gray-900">
                {[
                  'Syarat & Ketentuan dapat diperbarui sewaktu-waktu.',
                  'Perubahan akan berlaku setelah dipublikasikan.',
                  'Penggunaan layanan setelah perubahan dianggap sebagai persetujuan.',
                  'Silakan memeriksa halaman ini secara berkala.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <RefreshCcw
                      size={18}
                      className="mt-1 shrink-0 text-orange-500"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

          </div>

          {/* ====================================== */}
          {/* CONTACT */}
          {/* ====================================== */}

          <motion.section
            initial={{
              opacity: 0,
              y: 40,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
            }}
            viewport={{
              once: true,
            }}
            className="
              mt-16
              overflow-hidden
              rounded-3xl
              bg-orange-500
              p-6
              text-center
              text-white
              shadow-2xl
              sm:p-10
              md:mt-24
              md:p-16
            "
          >

            <div className="mx-auto max-w-3xl">

              <p className="text-sm font-semibold uppercase tracking-[4px] text-orange-100 sm:tracking-[5px]">
                Hubungi Kami
              </p>

              <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
                Masih Memiliki Pertanyaan?
              </h2>

              <p className="mt-5 text-base leading-8 text-orange-50 sm:mt-6 sm:text-lg">
                Apabila Anda memiliki
                pertanyaan mengenai
                Syarat & Ketentuan
                penggunaan layanan
                Mr. Oey Bakery,
                silakan menghubungi kami
                melalui WhatsApp atau
                Instagram.
              </p>

              <div className="mt-10 flex flex-col justify-center gap-5 sm:flex-row">

                <button
                  onClick={handleClickWA}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-3
                    rounded-full
                    bg-white
                    px-8
                    py-4
                    font-semibold
                    text-orange-500
                    transition-all
                    duration-300
                    hover:scale-105
                  "
                >
                  <FaWhatsapp size={22} />
                  WhatsApp
                </button>

                <button
                  onClick={handleClickIG}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-3
                    rounded-full
                    border
                    border-white
                    px-8
                    py-4
                    font-semibold
                    text-white
                    transition-all
                    duration-300
                    hover:scale-105
                    hover:bg-white
                    hover:text-orange-500
                  "
                >
                  <FaInstagram size={22} />
                  Instagram
                </button>

              </div>
            </div>
          </motion.section>

        </div>
      </section>
    </main>
  )
}

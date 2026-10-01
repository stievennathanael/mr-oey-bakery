'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  BadgeInfo,
  CheckCircle2,
  Clock3,
  CreditCard,
  HelpCircle,
  History,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from 'lucide-react'
import {
  FaInstagram,
  FaWhatsapp,
} from 'react-icons/fa'

const faqItems = [
  {
    icon: UserRound,
    question:
      'Apakah saya harus login sebelum menambahkan produk ke keranjang?',
    answer:
      'Ya. Anda perlu login terlebih dahulu agar sistem dapat menyimpan keranjang belanja dan melanjutkan proses pemesanan.',
  },
  {
    icon: ShoppingCart,
    question:
      'Apakah saya bisa menambahkan produk yang sama lebih dari satu kali?',
    answer:
      'Bisa. Anda dapat menambah jumlah produk langsung pada halaman detail atau menambahkan kembali produk yang sama ke keranjang.',
  },
  {
    icon: ShoppingBag,
    question:
      'Bagaimana cara menambahkan produk ke keranjang?',
    answer:
      'Pilih produk yang diinginkan pada halaman Produk, tentukan jumlah pembelian, kemudian klik tombol Tambahkan Ke Keranjang. Produk akan otomatis masuk ke keranjang belanja Anda.',
  },
  {
    icon: CheckCircle2,
    question:
      'Apa yang terjadi jika produk berhasil ditambahkan ke keranjang?',
    answer:
      'Sistem akan menampilkan notifikasi bahwa produk berhasil ditambahkan. Anda dapat melanjutkan berbelanja atau membuka halaman keranjang untuk melihat daftar produk yang telah dipilih.',
  },
  {
    icon: PackageCheck,
    question: 'Bagaimana cara melakukan checkout?',
    answer:
      'Pastikan keranjang berisi produk dan lokasi pengambilan telah dipilih. Setelah itu klik tombol Checkout untuk membuat pesanan dan melanjutkan ke proses pembayaran.',
  },
  {
    icon: CreditCard,
    question: 'Metode pembayaran apa yang digunakan?',
    answer:
      'Pembayaran dilakukan melalui Midtrans, sehingga Anda dapat memilih berbagai metode pembayaran yang tersedia pada halaman pembayaran Midtrans.',
  },
  {
    icon: ReceiptText,
    question:
      'Apa yang terjadi setelah checkout berhasil dibuat?',
    answer:
      'Setelah checkout berhasil, sistem akan membuat nomor invoice dan menampilkan halaman pembayaran Midtrans untuk menyelesaikan transaksi.',
  },
  {
    icon: Clock3,
    question:
      'Bagaimana jika saya menutup halaman pembayaran Midtrans?',
    answer:
      'Anda masih dapat melanjutkan pembayaran selama batas waktu pembayaran belum berakhir atau belum expired.',
  },
  {
    icon: BadgeInfo,
    question:
      'Apakah saya dapat melihat detail pesanan setelah checkout?',
    answer:
      'Ya. Setelah checkout, Anda dapat menekan tombol Lihat Order untuk melihat daftar pesanan beserta statusnya.',
  },
  {
    icon: History,
    question: 'Apa fungsi halaman Pesanan Saya?',
    answer:
      'Halaman Pesanan Saya digunakan untuk melihat seluruh riwayat pesanan yang telah Anda buat setelah melakukan checkout. Di halaman ini Anda dapat melihat detail produk, total pembayaran, status pembayaran, status pesanan, lokasi pengambilan, serta informasi pembayaran apabila masih menunggu pembayaran.',
  },
  {
    icon: CreditCard,
    question:
      'Apa arti status pembayaran pada pesanan?',
    answer:
      'Status pembayaran menunjukkan kondisi pembayaran pesanan, seperti:',
    points: [
      'Pending - Pembayaran masih menunggu penyelesaian.',
      'Paid - Pembayaran berhasil diterima.',
      'Expired - Waktu pembayaran telah habis.',
      'Failed - Pembayaran gagal diproses.',
    ],
  },
  {
    icon: PackageCheck,
    question: 'Apa arti status pesanan?',
    answer:
      'Status pesanan menunjukkan proses pengerjaan pesanan oleh toko, misalnya:',
    points: [
      'Pending - Pesanan baru diterima.',
      'Processing - Pesanan sedang diproses.',
      'Ready - Pesanan siap diambil.',
      'Completed - Pesanan telah selesai.',
      'Cancelled - Pesanan dibatalkan.',
    ],
  },
  {
    icon: Clock3,
    question:
      'Apa fungsi tombol "Lanjutkan Pembayaran"?',
    answer:
      'Tombol ini akan membuka halaman pembayaran Midtrans sehingga Anda dapat menyelesaikan transaksi yang masih berstatus Pending tanpa perlu melakukan checkout ulang.',
  },
]

export default function FaqsPage() {
  const handleScroll = () => {
    document
      .getElementById('faqs-content')
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }

  const handleClickWA = () => {
    const phone = '628978544484'
    const message = encodeURIComponent(
      'Halo, saya ingin bertanya mengenai FAQ Mr. Oey Bakery.'
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
      <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-28 sm:px-6">
        <Image
          src="/mainbg2.jpg"
          alt="FAQs"
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
            FAQs
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-gray-200 sm:mt-8 sm:text-lg md:text-xl">
            Temukan jawaban seputar akun,
            keranjang, checkout, pembayaran,
            hingga riwayat pesanan di
            Mr. Oey Bakery.
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
            Lihat FAQs
            <ArrowDown size={20} />
          </button>
        </motion.div>
      </section>

      <section
        id="faqs-content"
        className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24"
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
              Pertanyaan Umum
            </p>

            <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Bantuan Untuk Pelanggan
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-900 sm:mt-6 sm:text-lg">
              Halaman ini berisi daftar
              pertanyaan yang sering muncul
              ketika pelanggan menggunakan
              website Mr. Oey Bakery.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
            {faqItems.map((item) => {
              const Icon = item.icon

              return (
                <motion.div
                  key={item.question}
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
                    <Icon
                      size={34}
                      className="text-orange-500"
                    />
                  </div>

                  <h3 className="mb-4 text-xl font-bold leading-snug text-gray-900 sm:mb-5 sm:text-2xl">
                    {item.question}
                  </h3>

                  <p className="leading-8 text-gray-900">
                    {item.answer}
                  </p>

                  {item.points && (
                    <ul className="mt-5 space-y-4 leading-8 text-gray-900">
                      {item.points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-3"
                        >
                          <HelpCircle
                            size={18}
                            className="mt-1 shrink-0 text-orange-500"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )
            })}
          </div>

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
              rounded-[32px]
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
                Apabila jawaban yang Anda
                cari belum tersedia, silakan
                menghubungi kami melalui
                WhatsApp atau Instagram.
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

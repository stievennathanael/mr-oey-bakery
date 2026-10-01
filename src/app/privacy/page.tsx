'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowDown,
  ShieldCheck,
  UserRound,
  ShoppingCart,
  CreditCard,
  Settings,
  Database,
  Users,
  BadgeCheck,
  RefreshCcw,
  MessageCircle,
  User,
  Mail,
  Phone,
  Package,
  Boxes,
  Wallet,
  Receipt,
  MapPin,
  History,
  UserCog,
  ShoppingBag,
  ClipboardList,
  BellRing,
  TrendingUp,
  Lock,
  Shield,
  UserLock,
  BriefcaseBusiness,
  LifeBuoy,
  LogOut,
  MessageCircleMore,
} from 'lucide-react'
import { FaWhatsapp, FaInstagram } from 'react-icons/fa'

export default function PrivacyPage() {

  const handleScroll = () => {
    document
      .getElementById('privacy-content')
      ?.scrollIntoView({
        behavior: 'smooth',
      })
  }

  const handleClickWA = () => {
    const phone = '628978544484'
    const message = encodeURIComponent(
      'Halo, saya ingin bertanya mengenai Kebijakan Privasi Mr. Oey Bakery.'
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
      {/* HERO SECTION */}
      {/* ====================================== */}

      <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-28 sm:px-6">
        <Image
          src="/mainbg2.jpg"
          alt="Privacy Policy"
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
            Kebijakan Privasi
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-gray-200 sm:mt-8 sm:text-lg md:text-xl">
            Kami berkomitmen menjaga
            keamanan dan kerahasiaan
            seluruh informasi pribadi
            pelanggan selama menggunakan
            layanan serta website
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
            Lihat Kebijakan Privasi
            <ArrowDown size={20} />
          </button>
        </motion.div>
      </section>

      {/* ====================================== */}
      {/* CONTENT */}
      {/* ====================================== */}

      <section
        id="privacy-content"
        className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-20 lg:py-24"
      >
        {/* Blur */}
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
              Kebijakan Privasi
            </p>

            <h2 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
              Komitmen Kami Terhadap
              Privasi Pelanggan
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-900 sm:mt-6 sm:text-lg">
              Halaman ini menjelaskan
              bagaimana informasi pelanggan
              dikumpulkan, digunakan,
              disimpan, dan dilindungi
              ketika menggunakan website
              Mr. Oey Bakery.
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
                <ShieldCheck
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-4 text-xl font-bold text-gray-900 sm:mb-5 sm:text-2xl">
                Pendahuluan
              </h3>

              <p className="leading-8 text-gray-900">
                Selamat datang di
                <strong> Mr. Oey Bakery</strong>.
                Kami menghargai privasi
                seluruh pelanggan dan
                berkomitmen menjaga setiap
                informasi pribadi yang
                diberikan ketika menggunakan
                website maupun layanan kami.
              </p>
            </motion.div>

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
                <UserRound
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Informasi Akun
              </h3>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-center gap-3">
                  <User
                  size={20}
                  className="text-orange-500"
                  />
                  <span>Nama pelanggan</span>
                </li>

                <li className="flex items-center gap-3">
                  <Mail
                  size={20}
                  className="text-orange-500"
                  />
                  <span>Alamat email</span>
                </li>

                <li className="flex items-center gap-3">
                  <Phone
                  size={20}
                  className="text-orange-500"
                  />
                  <span>Nomor telepon</span>
                </li>
              </ul>
            </motion.div>

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
                <ShoppingCart
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Informasi Pesanan
              </h3>

              <p className="mb-4 leading-8 text-gray-900">
                Untuk memproses pesanan,
                kami menyimpan informasi
                berikut:
              </p>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-center gap-3">
                  <Package
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Produk yang dibeli
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <Boxes
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Jumlah produk
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <Wallet
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Total pembayaran
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <Receipt
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Nomor invoice
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <MapPin
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Lokasi pengambilan
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <History
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Riwayat transaksi
                  </span>
                </li>
              </ul>
            </motion.div>

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
                <CreditCard
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Informasi Pembayaran
              </h3>

              <p className="leading-8 text-gray-900">
                Seluruh pembayaran online
                diproses melalui Midtrans.
                Kami tidak menyimpan nomor
                kartu kredit, kartu debit,
                PIN, maupun informasi
                rekening bank pelanggan.
              </p>
            </motion.div>

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
                <Settings
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Penggunaan Informasi
              </h3>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-center gap-3">
                  <UserCog
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Mengelola akun pelanggan
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <ShoppingBag
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Memproses checkout
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <CreditCard
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Memverifikasi pembayaran
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <ClipboardList
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Menampilkan riwayat pesanan
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <BellRing
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Memberikan status pesanan
                  </span>
                </li>

                <li className="flex items-center gap-3">
                  <TrendingUp
                  size={20}
                  className="shrink-0 text-orange-500"
                  />
                  <span className="text-gray-900">
                  Meningkatkan kualitas layanan
                  </span>
                </li>
              </ul>
            </motion.div>

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
                <ShieldCheck
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Perlindungan Data
              </h3>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-start gap-3">
                  <Lock
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Password disimpan dalam bentuk terenkripsi
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <Shield
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Sistem login menggunakan autentikasi
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <Database
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Data disimpan secara aman
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <UserLock
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Akses terhadap data dibatasi hanya untuk keperluan operasional
                  </span>
                </li>
              </ul>
            </motion.div>

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
                <Database
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Penyimpanan Data
              </h3>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-start gap-3">
                  <Receipt
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Riwayat transaksi
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <ClipboardList
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Riwayat pesanan
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <BriefcaseBusiness
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Keperluan administrasi
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <LifeBuoy
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Penyelesaian kendala pesanan
                  </span>
                </li>
              </ul>
            </motion.div>

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
                <Users
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Pembagian Informasi
              </h3>

              <p className="leading-8 text-gray-900">
                Kami tidak menjual maupun
                memperdagangkan data pribadi
                pelanggan. Informasi hanya
                dapat dibagikan kepada pihak
                ketiga apabila diperlukan
                untuk proses pembayaran
                melalui Midtrans atau untuk
                memenuhi kewajiban hukum yang
                berlaku.
              </p>
            </motion.div>

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
                <BadgeCheck
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Hak Pengguna
              </h3>

              <ul className="space-y-4 leading-8 text-gray-900">
                <li className="flex items-start gap-3">
                  <UserRound
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Melihat informasi akun
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <LogOut
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Logout kapan saja
                  </span>
                </li>

                <li className="flex items-start gap-3">
                  <MessageCircleMore
                  size={20}
                  className="mt-1 shrink-0 text-orange-500"
                  />
                  <span className="leading-7 text-gray-900">
                  Menghubungi kami apabila terdapat kesalahan data
                  </span>
                </li>
              </ul>
            </motion.div>

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
                <RefreshCcw
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mb-5 text-2xl font-bold text-gray-900">
                Perubahan Kebijakan
              </h3>

              <p className="leading-8 text-gray-900">
                Kebijakan Privasi ini dapat
                diperbarui sewaktu-waktu
                sesuai perkembangan layanan
                maupun ketentuan hukum yang
                berlaku. Setiap perubahan
                akan berlaku sejak tanggal
                pembaruan yang tercantum pada
                halaman ini.
              </p>
            </motion.div>

          </div>

          {/* ====================================== */}
          {/* CONTACT SECTION */}
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
                  <FaWhatsapp
                    size={22}
                  />
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
                  <FaInstagram
                    size={22}
                  />
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

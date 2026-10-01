'use client'

import {
  useState,
  useEffect,
  useRef,
} from 'react'

import { useRouter } from 'next/navigation'

import {
  motion,
  AnimatePresence,
} from 'framer-motion'

import {
  Search,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  CakeSlice,
  Donut,
  CircleCheckBig,
  CircleX,
  Loader2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { notifyCartUpdated } from '@/lib/cart-events'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Product = {
  id: number
  product_name: string
  product_description: string
  category_name: string
  product_price: number
  image_url: string
}

type Category = {
  id: number
  name: string
}

type AlertType =
  | 'success'
  | 'warning'
  | 'error'

type AlertAction =
  | 'none'
  | 'login'
  | 'cart'

type AlertState = {
  type: AlertType
  title: string
  message: string
  buttonText: string
  action: AlertAction
}

type AddToCartResponse = {
  message?: string
  items?: unknown[]
  summary?: {
    total_items?: number
  }
}

const itemsPerPage = 12
const SUCCESS_DURATION = 2000

export default function MenuScreen() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState('all')

  const [currentPage, setCurrentPage] =
    useState(1)

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null)

  const [quantity, setQuantity] =
    useState(1)

  const [addingCart, setAddingCart] =
    useState(false)

  const [alertOpen, setAlertOpen] =
    useState(false)

  const [alertData, setAlertData] =
    useState<AlertState>({
      type: 'success',
      title: '',
      message: '',
      buttonText: 'OK',
      action: 'none',
    })

  const alertResolveRef =
    useRef<(() => void) | null>(
      null
    )

  async function fetchData() {
    try {
      const [productRes, categoryRes] =
        await Promise.all([
          fetch('/api/products', {
            cache: 'no-store',
          }),
          fetch('/api/categories', {
            cache: 'no-store',
          }),
        ])

      const productData =
        await productRes.json()

      const categoryData =
        await categoryRes.json()

      const sortedProducts =
        productData.sort(
          (
            a: Product,
            b: Product
          ) => a.id - b.id
        )

      setProducts(sortedProducts)
      setCategories(categoryData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  useAutoRefresh(fetchData)

  const filteredProducts =
    products.filter((product) => {
      const matchSearch =
        product.product_name
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchCategory =
        selectedCategory === 'all'
          ? true
          : product.category_name.toLowerCase() ===
            selectedCategory.toLowerCase()

      return (
        matchSearch &&
        matchCategory
      )
    })

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory])

  const totalPages = Math.ceil(
    filteredProducts.length /
      itemsPerPage
  )

  const indexOfLastItem =
    currentPage * itemsPerPage

  const indexOfFirstItem =
    indexOfLastItem -
    itemsPerPage

  const currentItems =
    filteredProducts.slice(
      indexOfFirstItem,
      indexOfLastItem
    )

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [currentPage])

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1)
    }
  }, [selectedProduct])

  const goToNextPage = () => {
    if (
      currentPage < totalPages
    ) {
      setCurrentPage(
        currentPage + 1
      )
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(
        currentPage - 1
      )
    }
  }

  useEffect(() => {
    document.body.classList.toggle(
      'overflow-hidden',
      !!selectedProduct || alertOpen
    )

    return () => {
      document.body.classList.remove(
        'overflow-hidden'
      )
    }
  }, [
    selectedProduct,
    alertOpen,
  ])

  function showAlert(
    data: AlertState
  ) {
    setAlertData(data)
    setAlertOpen(true)

    return new Promise<void>(
      (resolve) => {
        alertResolveRef.current =
          resolve
      }
    )
  }

  function closeAlert() {
    setAlertOpen(false)

    if (
      alertResolveRef.current
    ) {
      alertResolveRef.current()

      alertResolveRef.current =
        null
    }

    switch (alertData.action) {
      case 'login':
        router.push(
          '/auth/login'
        )
        break

      case 'cart':
        router.push('/cart')
        break

      default:
        break
    }
  }

  function dismissAlert() {
    setAlertOpen(false)

    if (alertResolveRef.current) {
      alertResolveRef.current()
      alertResolveRef.current = null
    }
  }

  async function addToCart() {
    setAddingCart(true)
    try {
      const token =
        localStorage.getItem(
          'customer_token'
        ) ||
        localStorage.getItem(
          'token'
        )

      if (!token) {
        await showAlert({
          type: 'warning',
          title: 'Silakan Masuk',
          message:
            'Silakan masuk terlebih dahulu untuk menambahkan produk ke keranjang.',
          buttonText: 'Masuk',
          action: 'login',
        })
        return
      }

      const response = await fetch(
        '/api/cart',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            product_id:
              selectedProduct?.id,
            quantity,
          }),
        }
      )

      const data =
        (await response.json()) as AddToCartResponse

      if (!response.ok) {
        await showAlert({
          type: 'error',
          title: 'Gagal',
          message:
            data.message ||
            'Gagal menambahkan ke keranjang.',
          buttonText: 'OK',
          action: 'none',
        })
        return
      }

      notifyCartUpdated(
        Array.isArray(data.items)
          ? data.items.length
          : undefined
      )

      setSelectedProduct(null)

      await showAlert({
        type: 'success',
        title:
          'Produk Berhasil Ditambahkan',
        message:
          'Produk berhasil ditambahkan ke keranjang.',
        buttonText:
          'Lihat Keranjang',
        action: 'cart',
      })
    } catch (error) {
      console.error(error)

      await showAlert({
        type: 'error',
        title:
          'Terjadi Kesalahan',
        message:
          'Terjadi kesalahan. Silakan coba lagi.',
        buttonText: 'OK',
        action: 'none',
      })
    }
    finally {
      setAddingCart(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-100">

      {/* Background */}
      <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-[420px] w-[420px] rounded-full bg-orange-300/20 blur-3xl" />

      {/* Hero */}
      <section className="relative mb-10 mt-24 overflow-hidden sm:mt-32 lg:mb-12 lg:mt-36">

        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          <motion.div
            initial={{
                opacity: 0,
                y: 30,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              transition={{
                duration: 1.1,
                ease: [0.25, 1, 0.5, 1],
              }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 p-6 text-white shadow-2xl sm:p-8 lg:rounded-[40px] lg:p-12"
          >
            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-2">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur sm:px-5 sm:text-base">
                  <Sparkles size={18} />
                  Premium Bakery
                </div>

                <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-5xl">
                  Selalu Segar,
                  <br />
                  Rasa Lezat
                </h1>

                <p className="mt-5 max-w-lg text-base leading-relaxed text-orange-100 sm:mt-6 sm:text-lg">
                  Temukan berbagai pilihan roti,
                  chiffon, dan donat premium yang
                  dipanggang setiap hari menggunakan
                  bahan berkualitas terbaik.
                </p>

                <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">

                  <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur sm:px-6 sm:py-4">
                    <p className="text-2xl font-bold sm:text-3xl">
                      {products.length}
                    </p>
                    <p className="text-sm">
                      Produk
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur sm:px-6 sm:py-4">
                    <p className="text-2xl font-bold sm:text-3xl">
                      {categories.length}
                    </p>
                    <p className="text-sm">
                      Kategori
                    </p>
                  </div>

                </div>

              </div>

              <div className="hidden justify-center gap-8 sm:flex">

                {/* Cake */}
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="mb-6 rounded-3xl bg-white/20 p-7 backdrop-blur"
                >
                  <CakeSlice size={70} />
                </motion.div>

                {/* Donut */}
                <motion.div
                  animate={{
                    y: [0, 20, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.8,
                  }}
                  className="mb-20 rounded-3xl bg-white/20 p-7 backdrop-blur"
                >
                  <Donut size={70} />
                </motion.div>

                {/* Shopping */}
                <motion.div
                  animate={{
                    y: [0, -30, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1.4,
                  }}
                  className="mb-12 rounded-3xl bg-white/20 p-7 backdrop-blur"
                >
                  <ShoppingBag size={70} />
                </motion.div>

              </div>

            </div>

          </motion.div>

        </div>
      </section>

      {/* SEARCH & FILTER */}
      <section className="relative z-10 mx-auto mb-10 max-w-7xl px-4 sm:mb-12 sm:px-6">

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{ once: true }}
          className="
            rounded-3xl
            border
            border-orange-100
            bg-white/80
            p-4
            shadow-xl
            backdrop-blur-lg
            sm:p-6
          "
        >

          <div className="flex flex-col gap-5 lg:flex-row">

            {/* Search */}

            <div className="relative flex-1">

              <Search
                size={22}
                className="
                  absolute
                  left-5
                  top-1/2
                  -translate-y-1/2
                  text-orange-400
                "
              />

              <input
                type="text"
                placeholder="Cari produk favorit Anda..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="
                  h-14
                  w-full
                  rounded-2xl
                  border
                  border-orange-200
                  bg-white
                  pl-14
                  pr-5
                  text-gray-900
                  shadow-sm
                  outline-none
                  transition
                  focus:border-orange-500
                  focus:ring-4
                  focus:ring-orange-100
                "
              />

            </div>

            {/* Category */}

            <div className="relative lg:w-72">

              <ChevronDown
                size={22}
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-orange-500
                "
              />

              <select
                aria-label="Selected Category"
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value
                  )
                }
                className="
                  h-14
                  w-full
                  appearance-none
                  rounded-2xl
                  border
                  border-orange-200
                  bg-white
                  px-5
                  pr-12
                  text-gray-900
                  shadow-sm
                  outline-none
                  transition
                  focus:border-orange-500
                  focus:ring-4
                  focus:ring-orange-100
                "
              >
                <option value="all">
                  Semua Kategori
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.name}
                  >
                    {category.name}
                  </option>
                ))}
              </select>

            </div>

          </div>

        </motion.div>

      </section>

      {/* LOADING */}

      {loading ? (

        <div className="flex min-h-[360px] items-center justify-center">

          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />

        </div>

      ) : (

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-8">

            {currentItems.map(
              (
                product,
                index
              ) => (

                <motion.div
                  key={product.id}
                  initial={{
                    opacity: 0,
                    y: 30,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    delay:
                      index * 0.05,
                  }}
                  onClick={() =>
                    setSelectedProduct(
                      product
                    )
                  }
                  className="
                    group
                    cursor-pointer
                    overflow-hidden
                    rounded-[30px]
                    bg-white
                    shadow-lg
                    transition-all
                    duration-500
                    hover:-translate-y-3
                    hover:shadow-2xl
                  "
                >

                  {/* IMAGE */}

                  <div className="relative overflow-hidden">

                    <img
                      src={
                        product.image_url
                      }
                      alt={
                        product.product_name
                      }
                      className="
                        h-56
                        w-full
                        object-cover
                        transition
                        duration-700
                        sm:h-64
                        lg:h-72
                        group-hover:scale-110
                      "
                    />

                    <div
                      className="
                        absolute
                        left-5
                        top-5
                        rounded-full
                        bg-white/90
                        px-4
                        py-2
                        text-xs
                        font-bold
                        uppercase
                        tracking-wider
                        text-orange-500
                        shadow
                      "
                    >
                      {
                        product.category_name
                      }
                    </div>

                  </div>

                  {/* CONTENT */}

                  <div className="space-y-4 p-5 sm:p-6">

                    <h3
                      className="
                        line-clamp-1
                        text-xl
                        font-bold
                        text-gray-900
                      "
                    >
                      {
                        product.product_name
                      }
                    </h3>

                    <p
                      className="
                        line-clamp-2
                        text-sm
                        leading-relaxed
                        text-gray-800
                      "
                    >
                      {
                        product.product_description
                      }
                    </p>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="text-sm text-gray-800">
                          Harga
                        </p>

                        <p
                          className="
                            text-2xl
                            font-bold
                            text-orange-600
                          "
                        >
                          Rp{' '}
                          {Number(
                            product.product_price
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </p>

                      </div>

                      <button
                        className="
                          rounded-xl
                          bg-orange-500
                          px-4
                          py-2
                          font-semibold
                          text-white
                          transition
                          hover:bg-orange-600
                        "
                      >
                        Detail
                      </button>

                    </div>

                  </div>

                </motion.div>

              )
            )}

          </div>

          {/* EMPTY */}

          {filteredProducts.length === 0 && (

            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="
                py-24
                rounded-[32px]
                bg-white
                p-6
                text-center
                shadow-xl
                sm:p-12
                lg:p-20
              "
            >

              <h2 className="text-3xl font-bold text-gray-900">
                Produk Tidak Ditemukan
              </h2>

              <p className="mt-3 text-gray-500">
                Coba gunakan kata kunci
                lain atau pilih kategori
                berbeda.
              </p>

            </motion.div>

          )}

          {/* PAGINATION */}

          {totalPages > 1 && (

            <div className="mt-12 flex flex-wrap justify-center gap-3 sm:mt-16">

              <button
                onClick={
                  goToPreviousPage
                }
                disabled={
                  currentPage === 1
                }
                className="
                  rounded-xl
                  border
                  border-orange-200
                  bg-white
                  px-5
                  py-3
                  font-semibold
                  text-orange-500
                  transition
                  hover:bg-orange-50
                  disabled:opacity-40
                "
              >
                ←
              </button>

              {[...Array(totalPages)].map(
                (_, i) => {

                  const page =
                    i + 1

                  return (

                    <button
                      key={page}
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                      className={`
                        h-12
                        w-12
                        rounded-xl
                        font-bold
                        transition

                        ${
                          currentPage ===
                          page
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-white text-orange-500 hover:bg-orange-50'
                        }
                      `}
                    >
                      {page}
                    </button>

                  )
                }
              )}

              <button
                onClick={
                  goToNextPage
                }
                disabled={
                  currentPage ===
                  totalPages
                }
                className="
                  rounded-xl
                  border
                  border-orange-200
                  bg-white
                  px-5
                  py-3
                  font-semibold
                  text-orange-500
                  transition
                  hover:bg-orange-50
                  disabled:opacity-40
                "
              >
                →
              </button>

            </div>

          )}

      </section>
      )}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              duration: 0.35,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-[24px] bg-white shadow-2xl lg:rounded-[28px]"
          >
            {/* Close */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="
                absolute
                right-5
                top-5
                z-20
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-white
                text-3xl
                text-gray-600
                shadow-lg
                transition
                hover:bg-red-500
                hover:text-white
              "
            >
              <X size={20} />
            </button>

            <div className="grid lg:grid-cols-2">

              {/* IMAGE */}
              <div className="relative overflow-hidden bg-orange-50">

                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.product_name}
                  className="
                    h-64
                    w-full
                    object-cover
                    transition
                    duration-700
                    hover:scale-110
                    sm:h-80
                    lg:h-full
                  "
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

              </div>

              {/* CONTENT */}
              <div className="flex flex-col justify-center p-5 sm:p-8">

                <span
                  className="
                    w-fit
                    rounded-full
                    bg-orange-100
                    px-3
                    py-1.5
                    text-sm
                    font-semibold
                    text-orange-500
                  "
                >
                  {selectedProduct.category_name}
                </span>

                <h2 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
                  {selectedProduct.product_name}
                </h2>

                <p className="mt-4 text-gray-900">
                  {selectedProduct.product_description}
                </p>

                <h3 className="mt-6 text-3xl font-bold text-orange-500">
                  Rp{' '}
                  {Number(
                    selectedProduct.product_price
                  ).toLocaleString('id-ID')}
                </h3>

                {/* Quantity */}

                <div className="mt-6 flex flex-col gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3 sm:flex-row sm:items-center sm:justify-between">

                  <span className="font-medium text-gray-900">
                    Jumlah
                  </span>

                  <div className="flex items-center rounded-xl border bg-white">

                    <button
                      onClick={() =>
                        setQuantity((prev) =>
                          Math.max(1, prev - 1)
                        )
                      }
                      className="
                        px-4
                        py-2
                        text-lg
                        font-bold
                        text-orange-500
                        transition
                        hover:bg-orange-100
                      "
                    >
                      −
                    </button>

                    <span className="min-w-[55px] text-center text-gray-900 font-medium">
                      {quantity}
                    </span>

                    <button
                      onClick={() =>
                        setQuantity((prev) => prev + 1)
                      }
                      className="
                        px-4
                        py-2
                        text-lg
                        font-bold
                        text-orange-500
                        transition
                        hover:bg-orange-100
                      "
                    >
                      +
                    </button>

                  </div>

                </div>

                {/* Total */}

                <div className="mt-6 rounded-xl bg-orange-500 p-5 text-white">

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                    <p className="text-lg font-semibold uppercase">
                      Total Harga
                    </p>

                    <h3 className="text-xl font-bold sm:text-2xl">
                      Rp{' '}
                      {(
                        Number(selectedProduct.product_price) * quantity
                      ).toLocaleString('id-ID')}
                    </h3>

                  </div>

                </div>

                {/* Button */}

                <button
                  type="button"
                  onClick={addToCart}
                  disabled={addingCart}
                  className="
                    mt-6
                    flex
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500
                    py-3
                    text-lg
                    font-bold
                    text-white
                    shadow-lg
                    transition-all
                    duration-300
                    hover:-translate-y-1
                    hover:bg-orange-600
                    hover:shadow-xl
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    disabled:hover:translate-y-0
                    disabled:hover:bg-orange-500
                    disabled:hover:shadow-lg
                  "
                >
                  {addingCart ? (
                    <>
                      <svg
                        className="mr-2 h-5 w-5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-20"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />

                        <path
                          className="opacity-90"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>

                      Menambahkan...
                    </>
                  ) : (
                    'Tambahkan Ke Keranjang'
                  )}
                </button>

              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* ================= ALERT MODAL ================= */}
      <AnimatePresence>
        {alertOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              transition={{
                duration: 0.2,
              }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                type="button"
                onClick={dismissAlert}
                className="
                  absolute
                  right-5
                  top-5
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-gray-100
                  text-gray-500
                  transition-all
                  duration-200
                  hover:bg-red-500
                  hover:text-white
                  active:scale-95
                "
              >
                <X size={20} />
              </button>
              {/* Icon */}
              <div className="flex justify-center">
                {alertData.type ===
                  'success' && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <CircleCheckBig className="h-12 w-12 text-green-600" />
                  </div>
                )}

                {alertData.type ===
                  'warning' && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                    <TriangleAlert className="h-12 w-12 text-orange-600" />
                  </div>
                )}

                {alertData.type ===
                  'error' && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                    <CircleX className="h-12 w-12 text-red-600" />
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">
                {alertData.title}
              </h2>

              {/* Message */}
              <p className="mt-3 text-center leading-relaxed text-slate-900">
                {alertData.message}
              </p>

              {/* Button */}
              <button
                type="button"
                onClick={closeAlert}
                className={`
                  mt-8
                  w-full
                  rounded-xl
                  py-3
                  text-lg
                  font-semibold
                  text-white
                  transition

                  ${
                    alertData.type ===
                    'success'
                      ? 'bg-green-600 hover:bg-green-700'
                      : alertData.type ===
                          'warning'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-red-600 hover:bg-red-700'
                  }
                `}
              >
                {alertData.buttonText}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

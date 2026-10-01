export const CART_UPDATED_EVENT = 'cart-updated'

export type CartUpdatedDetail = {
  cartProductCount?: number
  totalItems?: number
}

export function notifyCartUpdated(
  cartProductCount?: number
) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedCount =
    typeof cartProductCount === 'number' &&
    Number.isFinite(cartProductCount)
      ? Math.max(0, cartProductCount)
      : undefined

  window.dispatchEvent(
    new CustomEvent<CartUpdatedDetail>(
      CART_UPDATED_EVENT,
      {
        detail:
          normalizedCount === undefined
            ? {}
            : {
                cartProductCount:
                  normalizedCount,
              },
      }
    )
  )
}

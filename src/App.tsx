import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CartProvider } from '@/lib/cart'
import { AccountProvider } from '@/lib/account'
import { WishlistProvider } from '@/lib/wishlist'
import { A11yProvider } from '@/lib/a11y'
import { ThemeProvider } from '@/lib/theme'
import { Layout } from '@/components/site/Layout'
import { Home } from '@/pages/Home'
import { Shop } from '@/pages/Shop'
import { BuildYourKit } from '@/pages/BuildYourKit'
import { SearchPage } from '@/pages/SearchPage'
import { DealOfTheMonth } from '@/pages/DealOfTheMonth'
import { TheBuzz } from '@/pages/TheBuzz'
import { CollectionPage } from '@/pages/CollectionPage'
import { ProductPage } from '@/pages/ProductPage'
import { CartPage } from '@/pages/CartPage'
import { CheckoutSuccess } from '@/pages/CheckoutSuccess'
import { HowItWorks } from '@/pages/HowItWorks'
import { Installation } from '@/pages/Installation'
import { Faq } from '@/pages/Faq'
import { WhyAromaSense } from '@/pages/WhyAromaSense'
import { Rewards } from '@/pages/Rewards'
import { BlogIndex } from '@/pages/BlogIndex'
import { BlogPost } from '@/pages/BlogPost'
import { Contact } from '@/pages/Contact'
import { CmsPage } from '@/pages/CmsPage'
import { NotFound } from '@/pages/NotFound'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AccountAuth } from '@/pages/account/AccountAuth'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { AccountOverview } from '@/pages/account/AccountOverview'
import { AccountOrders } from '@/pages/account/AccountOrders'
import { AccountOrderDetail } from '@/pages/account/AccountOrderDetail'
import { AccountAddresses } from '@/pages/account/AccountAddresses'
import { AccountSubscriptions } from '@/pages/account/AccountSubscriptions'
import { AccountBilling } from '@/pages/account/AccountBilling'
import { AccountRewards } from '@/pages/account/AccountRewards'
import { AccountWishlist } from '@/pages/account/AccountWishlist'
import { AccountSettings } from '@/pages/account/AccountSettings'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <A11yProvider>
      <AccountProvider>
        <WishlistProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/build" element={<BuildYourKit />} />
              <Route path="/collections/starter-pack" element={<BuildYourKit />} />
              <Route path="/deal-of-the-month" element={<DealOfTheMonth />} />
              <Route path="/the-buzz" element={<TheBuzz />} />
              <Route path="/collections/:handle" element={<CollectionPage />} />
              <Route path="/products/:handle" element={<ProductPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/installation" element={<Installation />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/why-aroma-sense" element={<WhyAromaSense />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:handle" element={<BlogPost />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pages/:slug" element={<CmsPage />} />

              <Route path="/account/login" element={<AccountAuth mode="login" />} />
              <Route path="/account/register" element={<AccountAuth mode="register" />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountOverview />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="orders/:reference" element={<AccountOrderDetail />} />
                <Route path="addresses" element={<AccountAddresses />} />
                <Route path="rewards" element={<AccountRewards />} />
                <Route path="subscriptions" element={<AccountSubscriptions />} />
                <Route path="billing" element={<AccountBilling />} />
                <Route path="wishlist" element={<AccountWishlist />} />
                <Route path="settings" element={<AccountSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </CartProvider>
        </WishlistProvider>
      </AccountProvider>
      </A11yProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppRouteId } from './routes';
import { CompanyProfileModal } from '../components/artisans/CompanyProfileModal';
import { CustomCakeModal } from '../components/artisans/CustomCakeModal';
import { CartDrawer } from '../components/cart/CartDrawer';
import { Footer } from '../components/navigation/Footer';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { MobileNavDrawer } from '../components/navigation/MobileNavDrawer';
import { TopHeader } from '../components/navigation/TopHeader';
import { useCart } from '../hooks/useCart';
import { useCustomerProfile } from '../hooks/useCustomerProfile';
import { authClient } from '../services/auth-client';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AuthPage } from '../pages/AuthPage';
import { ArtisansBlueprintPage } from '../pages/ArtisansBlueprintPage';
import { CatalogBlueprintPage } from '../pages/CatalogBlueprintPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { MarketplaceFoundationPage } from '../pages/MarketplaceFoundationPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SellerDashboardPage } from '../pages/SellerDashboardPage';
import { SellerOnboardingPage } from '../pages/SellerOnboardingPage';
import { SystemArchitecturePage } from '../pages/SystemArchitecturePage';
import {
  fetchCompanies,
  fetchPlatformConfig,
  fetchReels,
  fetchShowcaseCatalog,
  fetchStories,
} from '../services/api/client';
import {
  BakeryReel,
  BakeryStory,
  BakerySummary,
  ConfirmedOrderReceipt,
  PlatformSettingsRecord,
  ProductCategory,
  ShowcaseProduct,
} from '../types';

function resolveInitialRouteFromLocation(): AppRouteId {
  try {
    const rawPath = (window.location.pathname || '/').toLowerCase();
    const rawHash = (window.location.hash || '').toLowerCase().replace(/^#/, '');
    const target = rawHash.startsWith('/') ? rawHash : rawPath;
    if (target.startsWith('/admin')) return 'admin';
    if (target.startsWith('/seller/onboarding')) return 'seller-onboarding';
    if (target.startsWith('/seller')) return 'seller';
    if (target.startsWith('/catalog')) return 'catalog';
    if (target.startsWith('/artisans')) return 'artisans';
    if (target.startsWith('/favorites')) return 'favorites';
    if (target.startsWith('/profile')) return 'profile';
    if (target.startsWith('/sign-in')) return 'sign-in';
    if (target.startsWith('/system')) return 'system';
  } catch {
    // ignore
  }
  return 'marketplace';
}

function getPathForRoute(route: AppRouteId): string {
  switch (route) {
    case 'admin':
      return '/admin';
    case 'seller-onboarding':
      return '/seller/onboarding';
    case 'seller':
      return '/seller';
    case 'catalog':
      return '/catalog';
    case 'artisans':
      return '/artisans';
    case 'favorites':
      return '/favorites';
    case 'profile':
      return '/profile';
    case 'sign-in':
      return '/sign-in';
    case 'system':
      return '/system';
    case 'marketplace':
    default:
      return '/';
  }
}

export function AppShell() {
  const { locale, t } = useTranslation();
  const { data: authSession } = authClient.useSession();
  const [activeRoute, setActiveRoute] = useState<AppRouteId>(() => resolveInitialRouteFromLocation());
  const [platformConfig, setPlatformConfig] = useState<PlatformSettingsRecord | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [catalogBakeryId, setCatalogBakeryId] = useState<string>('all');

  const [allProducts, setAllProducts] = useState<ShowcaseProduct[]>([]);
  const [bakeries, setBakeries] = useState<BakerySummary[]>([]);
  const [stories, setStories] = useState<BakeryStory[]>([]);
  const [reels, setReels] = useState<BakeryReel[]>([]);
  const [activeProduct, setActiveProduct] = useState<ShowcaseProduct | null>(null);
  const [activeBakeryProfile, setActiveBakeryProfile] = useState<BakerySummary | null>(null);
  const [activeCustomCakeBakery, setActiveCustomCakeBakery] = useState<BakerySummary | null>(null);

  const routeStackRef = useRef<AppRouteId[]>([resolveInitialRouteFromLocation()]);
  const stateRef = useRef({
    activeRoute,
    activeProduct,
    activeBakeryProfile,
    activeCustomCakeBakery,
    isCartOpen,
    isMobileMenuOpen,
  });

  stateRef.current = {
    activeRoute,
    activeProduct,
    activeBakeryProfile,
    activeCustomCakeBakery,
    isCartOpen,
    isMobileMenuOpen,
  };

  const {
    profile,
    updateProfile,
    addSavedAddress,
    setDefaultSavedAddress,
    removeSavedAddress,
    resetProfile,
  } = useCustomerProfile(authSession?.user?.id);

  const {
    favoriteIds,
    toggleFavorite,
    isFavorite,
    followedBakeryIds,
    toggleFollowBakery,
  } = useFavorites();

  const {
    items: cartItems,
    totalCount: cartCount,
    addToCart,
    addCustomCakeToCart,
    updateQuantity,
    removeLine,
    clearCart,
    recentOrders,
    addConfirmedOrder,
    updateOrderReceipt,
  } = useCart();

  const refreshCatalogAndCompanies = () => {
    void fetchCompanies()
      .then((res) => setBakeries(res.items))
      .catch(() => {});

    void fetchShowcaseCatalog()
      .then((res) => setAllProducts(res.items))
      .catch(() => {});

    void fetchPlatformConfig()
      .then((cfg) => setPlatformConfig(cfg))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCatalogAndCompanies();

    void fetchStories()
      .then((res) => setStories(res.items))
      .catch(() => {});

    void fetchReels()
      .then((res) => setReels(res.items))
      .catch(() => {});
  }, []);

  // Guard against accidental page refresh/close and accidental browser Back navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((window as Window & { __sweetMarketAuthNavigation?: boolean }).__sweetMarketAuthNavigation) return;
      e.preventDefault();
      e.returnValue = '';
    };

    try {
      window.history.pushState({ sweetMarketGuard: true }, '', window.location.href);
    } catch {
      // Ignore restricted history API contexts
    }

    const handlePopState = () => {
      try {
        window.history.pushState({ sweetMarketGuard: true }, '', window.location.href);
      } catch {
        // Ignore restricted history API contexts
      }

      const snap = stateRef.current;
      if (snap.isCartOpen) {
        setIsCartOpen(false);
        return;
      }
      if (snap.isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return;
      }
      if (snap.activeCustomCakeBakery) {
        setActiveCustomCakeBakery(null);
        return;
      }
      if (snap.activeBakeryProfile) {
        setActiveBakeryProfile(null);
        return;
      }
      if (snap.activeProduct) {
        setActiveProduct(null);
        return;
      }
      if (routeStackRef.current.length > 1) {
        routeStackRef.current.pop();
        const previousRoute = routeStackRef.current[routeStackRef.current.length - 1] ?? 'marketplace';
        setActiveRoute(previousRoute);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const routeTitleMap: Record<AppRouteId, string> = {
    marketplace: `${t.brand.name} — ${t.nav.marketplace}`,
    catalog: `${t.brand.name} — ${t.nav.catalog}`,
    artisans: `${t.brand.name} — ${t.nav.artisans}`,
    favorites: `${t.brand.name} — ${t.nav.favorites}`,
    profile: `${t.brand.name} — ${t.nav.profile}`,
    'sign-in': `${t.brand.name} — Sign in`,
    'seller-onboarding': `${t.brand.name} — ${locale === 'uz' ? 'Sotuvchi profili' : 'Профиль продавца'}`,
    seller: `${t.brand.name} — ${t.nav.seller}`,
    admin: `${t.brand.name} — Admin Panel`,
    system: `${t.brand.name} — ${t.nav.system}`,
  };

  useDocumentTitle(
    activeProduct
      ? `${activeProduct.title[t.common.activeLocale]} — ${t.brand.name}`
      : routeTitleMap[activeRoute],
  );

  const handleNavigate = (route: AppRouteId) => {
    setActiveProduct(null);
    if (route !== activeRoute) {
      routeStackRef.current.push(route);
      if (routeStackRef.current.length > 25) {
        routeStackRef.current = routeStackRef.current.slice(-25);
      }
    }
    try {
      const nextPath = getPathForRoute(route);
      window.history.replaceState({ sweetMarketGuard: true }, '', nextPath);
    } catch {
      // ignore
    }
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedDistrict('all');
    setCatalogBakeryId('all');
  };

  const handleQuickAdd = (product: ShowcaseProduct) => {
    const defaultVariant = product.variants[0];
    if (!defaultVariant) return;
    addToCart({
      product,
      variant: defaultVariant,
      quantity: 1,
      customNote: '',
    });
  };

  const handleViewBakeryProducts = (bakeryId: string) => {
    setCatalogBakeryId(bakeryId);
    handleNavigate('catalog');
  };

  const handleStoryUpdated = (updatedStory: BakeryStory) => {
    setStories((prev) =>
      prev.map((s) => (s.id === updatedStory.id ? updatedStory : s)),
    );
  };

  const handleReorderItems = (order: ConfirmedOrderReceipt) => {
    for (const so of order.sellerOrders) {
      for (const item of so.items) {
        const matched = allProducts.find((p) => p.id === item.productId);
        if (!matched) continue;
        const matchedVariant =
          matched.variants.find(
            (v) => v.label.uz === item.variantLabel.uz || v.priceUzs === item.unitPriceUzs,
          ) ?? matched.variants[0];
        if (!matchedVariant) continue;
        addToCart({
          product: matched,
          variant: matchedVariant,
          quantity: item.quantity,
          customNote: item.customNote ?? '',
        });
      }
    }
  };

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    return allProducts
      .filter(
        (item) =>
          item.id !== activeProduct.id &&
          (item.category === activeProduct.category ||
            item.bakeryId === activeProduct.bakeryId),
      )
      .slice(0, 3);
  }, [activeProduct, allProducts]);

  const activeProductBakery = useMemo(() => {
    if (!activeProduct) return undefined;
    return bakeries.find((b) => b.id === activeProduct.bakeryId);
  }, [activeProduct, bakeries]);

  if (activeRoute === 'admin' && !authSession?.user) {
    return <AuthPage onClose={() => handleNavigate('marketplace')} />;
  }

  if (activeRoute === 'admin') {
    return (
      <AdminDashboardPage
        onBackToStorefront={() => handleNavigate('marketplace')}
        onOpenSellerPortal={() => handleNavigate('seller')}
        onPlatformDataChanged={refreshCatalogAndCompanies}
      />
    );
  }

  if (activeRoute === 'sign-in') {
    return <AuthPage onClose={() => handleNavigate('marketplace')} />;
  }

  if (activeRoute === 'seller-onboarding') {
    return (
      <SellerOnboardingPage
        initialName={authSession?.user?.name ?? ''}
        onClose={() => handleNavigate('marketplace')}
      />
    );
  }

  if (activeRoute === 'seller') {
    return (
      <div className="min-h-screen bg-[var(--sm-bg-canvas)] text-[var(--sm-text-primary)]">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <SellerDashboardPage
            bakeries={bakeries}
            onBackToProfile={() => handleNavigate('marketplace')}
            onCatalogChanged={refreshCatalogAndCompanies}
          />
        </div>
      </div>
    );
  }

  const announcementText =
    platformConfig?.announcementEnabled
      ? locale === 'uz'
        ? platformConfig.announcementUz
        : platformConfig.announcementRu
      : '';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sm-bg-canvas)] text-[var(--sm-text-primary)] pb-20 md:pb-0">
      {announcementText && (
        <div className="bg-[var(--sm-accent-primary)] px-4 py-1.5 text-center text-xs font-medium text-[var(--sm-text-inverse)]">
          {announcementText}
        </div>
      )}

      <TopHeader
        activeRoute={activeRoute}
        cartCount={cartCount}
        favoritesCount={favoriteIds.length}
        onNavigate={handleNavigate}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 w-full">
        {activeProduct ? (
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
            <ProductDetailPage
              product={activeProduct}
              bakery={activeProductBakery}
              relatedProducts={relatedProducts}
              isFavorite={isFavorite(activeProduct.id)}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onAddToCart={addToCart}
              onQuickAdd={handleQuickAdd}
              onOpenCart={() => setIsCartOpen(true)}
              onSelectProduct={setActiveProduct}
              onOpenBakeryProfile={setActiveBakeryProfile}
              onBack={() => setActiveProduct(null)}
            />
          </div>
        ) : (
          <>
            {activeRoute === 'marketplace' && (
              <MarketplaceFoundationPage
                selectedCategory={selectedCategory}
                selectedDistrict={selectedDistrict}
                favoriteIds={favoriteIds}
                onSelectCategory={setSelectedCategory}
                onSelectDistrict={setSelectedDistrict}
                onToggleFavorite={toggleFavorite}
                onSelectProduct={setActiveProduct}
                onQuickAdd={handleQuickAdd}
                onResetAllFilters={handleResetFilters}
                onNavigate={handleNavigate}
              />
            )}

            {activeRoute !== 'marketplace' && (
              <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10">
                {activeRoute === 'catalog' && (
                  <CatalogBlueprintPage
                    stories={stories}
                    reels={reels}
                    allProducts={allProducts}
                    bakeries={bakeries}
                    initialCategory={selectedCategory}
                    initialDistrict={selectedDistrict}
                    initialBakeryId={catalogBakeryId}
                    favoriteIds={favoriteIds}
                    onToggleFavorite={toggleFavorite}
                    onSelectProduct={setActiveProduct}
                    onQuickAdd={handleQuickAdd}
                    onStoryUpdated={handleStoryUpdated}
                  />
                )}
                {activeRoute === 'artisans' && (
                  <ArtisansBlueprintPage
                    bakeries={bakeries}
                    followedBakeryIds={followedBakeryIds}
                    onToggleFollowBakery={toggleFollowBakery}
                    onViewBakeryProducts={handleViewBakeryProducts}
                    onOpenBakeryProfile={setActiveBakeryProfile}
                    onOpenCustomCake={setActiveCustomCakeBakery}
                  />
                )}
                {activeRoute === 'favorites' && (
                  <FavoritesPage
                    allProducts={allProducts}
                    bakeries={bakeries}
                    favoriteIds={favoriteIds}
                    followedBakeryIds={followedBakeryIds}
                    onToggleFavorite={toggleFavorite}
                    onToggleFollowBakery={toggleFollowBakery}
                    onSelectProduct={setActiveProduct}
                    onQuickAdd={handleQuickAdd}
                    onViewBakeryProducts={handleViewBakeryProducts}
                    onExploreCatalog={() => handleNavigate('catalog')}
                    onExploreBakeries={() => handleNavigate('artisans')}
                  />
                )}
                {activeRoute === 'profile' && (authSession?.user ? (
                  <ProfilePage
                    profile={{ ...profile, fullName: authSession.user.name || profile.fullName }}
                    bakeries={bakeries}
                    allProducts={allProducts}
                    onUpdateProfile={updateProfile}
                    onAddAddress={addSavedAddress}
                    onSetDefaultAddress={setDefaultSavedAddress}
                    onRemoveAddress={removeSavedAddress}
                    onResetProfile={resetProfile}
                    recentOrders={recentOrders}
                    onOrderUpdated={updateOrderReceipt}
                    onReorderItems={handleReorderItems}
                    favoritesCount={favoriteIds.length}
                    followedBakeriesCount={followedBakeryIds.length}
                    onOpenSystem={() => handleNavigate('system')}
                    onOpenSellerCabinet={() => handleNavigate('seller')}
                    onSignOut={() => { void authClient.signOut().then(() => window.location.assign('/')); }}
                  />
                ) : <AuthPage onClose={() => handleNavigate('marketplace')} />)}
                {activeRoute === 'system' && <SystemArchitecturePage />}
              </div>
            )}
          </>
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <MobileBottomNav activeRoute={activeRoute} onNavigate={handleNavigate} />

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        activeRoute={activeRoute}
        selectedCategory={selectedCategory}
        cartCount={cartCount}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleNavigate}
        onSelectCategory={setSelectedCategory}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CompanyProfileModal
        bakery={activeBakeryProfile}
        allProducts={allProducts}
        isFollowing={
          activeBakeryProfile ? followedBakeryIds.includes(activeBakeryProfile.id) : false
        }
        defaultAuthorName={profile.fullName}
        onToggleFollow={toggleFollowBakery}
        onSelectProduct={setActiveProduct}
        onQuickAdd={handleQuickAdd}
        onOpenCustomCake={setActiveCustomCakeBakery}
        onClose={() => setActiveBakeryProfile(null)}
      />

      <CustomCakeModal
        bakery={activeCustomCakeBakery}
        onAddCustomCake={addCustomCakeToCart}
        onOpenCart={() => setIsCartOpen(true)}
        onClose={() => setActiveCustomCakeBakery(null)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        bakeries={bakeries}
        defaultProfile={profile}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveLine={removeLine}
        onClearCart={clearCart}
        onOrderConfirmed={addConfirmedOrder}
        onBrowseCatalog={() => handleNavigate('catalog')}
        onViewOrderHistory={() => handleNavigate('profile')}
      />
    </div>
  );
}

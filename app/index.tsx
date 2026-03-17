/**
 * ==========================================================
 * ONBOARDING / INITIAL SCREEN (Auto-Advancing Carousel)
 * ==========================================================
 * Purpose:
 * - Presents a multi-slide onboarding carousel describing key app features.
 * - Auto-advances slides on a timer while still allowing manual swiping.
 * - Uses scroll-driven animations for slide emphasis and a moving pagination indicator.
 * - Provides CTAs to go to Sign Up or Sign In.
 *
 * Key implementation details:
 * - Animated.FlatList + Animated.Value(scrollX) drives slide + pagination animations.
 * - useRef stores mutable values (scrollX, list ref, current index) without re-rendering.
 * - useMemo keeps slides array stable (better FlatList perf).
 * - useEffect starts/cleans interval for auto-advance.
 */

// React hooks used for stateful logic without a class component:
// - useRef: store mutable values (Animated.Value, refs, index) without re-rendering
// - useMemo: keep the slides array stable across renders
// - useEffect: set up/clean up the auto-advance timer
import { useEffect, useMemo, useRef } from "react";

// React Native primitives used to build the onboarding UI:
// - Animated: runs performant animations tied to scroll position
// - Dimensions: reads device window size (used for slide width)
// - Image/Text/View: UI building blocks
// - Pressable/TouchableOpacity: tap targets for CTAs
// - StyleSheet: centralizes styles with validation/performance benefits
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// SafeAreaView prevents content from overlapping device notch/status bar.
import { SafeAreaView } from "react-native-safe-area-context";

// Expo Router API for navigation between screens in an Expo Router project.
// router.push("/signup") pushes a new route onto the stack.
import { router } from "expo-router";

/**
 * SCREEN_WIDTH
 * ------------
 * Read the device width once. Each onboarding slide is exactly this width,
 * so `pagingEnabled` snaps perfectly slide-by-slide.
 */
const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * Pagination geometry constants
 * -----------------------------
 * DOT_SIZE: diameter of each inactive dot
 * DOT_GAP: spacing between dots
 * DOT_STEP: the distance the active indicator moves per slide (dot + gap)
 * ACTIVE_DOT_WIDTH: active indicator width (set equal to DOT_SIZE here)
 *
 * Note: If you want a "pill" indicator, set ACTIVE_DOT_WIDTH > DOT_SIZE.
 */
const DOT_SIZE = 7;
const DOT_GAP = 12;
const DOT_STEP = DOT_SIZE + DOT_GAP;
const ACTIVE_DOT_WIDTH = DOT_SIZE;

/**
 * FeatureSlide type
 * -----------------
 * Defines the shape of each slide item rendered by the FlatList.
 * - key: unique identifier (used by keyExtractor)
 * - title/description: visible text content
 */
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Get the full screen width so each onboarding slide can take up one full page.
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Constants used for the pagination dots under the carousel.
const DOT_SIZE = 7;
const DOT_GAP = 12;
const DOT_STEP = DOT_SIZE + DOT_GAP;

// Type definition for each onboarding feature card.
type FeatureSlide = {
  key: string;
  title: string;
  description: string;
};

export default function InitialScreen() {
  /**
   * scrollX
   * -------
   * Animated.Value that tracks the current horizontal scroll position (in pixels).
   * This is used to:
   * - animate each slide's opacity/scale/position
   * - animate the active pagination indicator
   */
  const scrollX = useRef(new Animated.Value(0)).current;

  /**
   * flatListRef
   * -----------
   * Reference to the Animated.FlatList instance so we can call scrollToOffset()
   * from the auto-advance interval.
   */
  const flatListRef = useRef<Animated.FlatList<FeatureSlide> | null>(null);

  /**
   * currentIndexRef
   * ---------------
   * Stores the current slide index without re-rendering the component.
   * This keeps the auto-advance timer aligned with user swipes.
   */
  const currentIndexRef = useRef(0);

  /**
   * slides
   * ------
   * Memoized slide data to keep the array reference stable between renders.
   * This prevents unnecessary FlatList re-processing.
   */
  iconLibrary: "Ionicons" | "MaterialCommunityIcons";
  iconName: string;
  iconColor: string;
  iconBg: string;
};

export default function InitialScreen() {
  // Animated value that tracks horizontal scrolling of the carousel.
  const scrollX = useRef(new Animated.Value(0)).current;

  // Ref to the FlatList so the app can programmatically move between slides.
  const flatListRef = useRef<Animated.FlatList<FeatureSlide> | null>(null);

  // Ref used to store the currently visible slide index.
  // useRef is used here so the value updates without causing re-renders.
  const currentIndexRef = useRef(0);

  // Memoized array of feature slides shown on the landing page.
  // useMemo keeps this array from being recreated on every render.
  const slides = useMemo<FeatureSlide[]>(
    () => [
      {
        key: "budgeting",
        title: "Smart Budgeting",
        description: "Create and track budgets. Get real-time alerts.",
        description:
          "Create and track budgets across multiple categories. Get real-time alerts when you're approaching limits.",
        iconLibrary: "Ionicons",
        iconName: "pie-chart-outline",
        iconColor: "#2563EB",
        iconBg: "#DBEAFE",
      },
      {
        key: "tracking",
        title: "Transaction Tracking",
        description: "Automatically categorize and track all your expenses.",
        description:
          "Automatically categorize and track all your expenses. Understand where your money goes with detailed insights.",
        iconLibrary: "Ionicons",
        iconName: "trending-up-outline",
        iconColor: "#16A34A",
        iconBg: "#DCFCE7",
      },
      {
        key: "advisor",
        title: "AI Financial Advisor",
        description: "Personalized financial advice powered by AI.",
        description:
          "Get personalized financial advice powered by AI. Ask questions and receive instant, actionable guidance.",
        iconLibrary: "Ionicons",
        iconName: "chatbubble-outline",
        iconColor: "#9333EA",
        iconBg: "#F3E8FF",
      },
      {
        key: "savings",
        title: "Savings Goals",
        description: "Set and track progress with visual indicators.",
      },
    ],
    []
  );

  /**
   * Auto-advance timer
   * ------------------
   * Every 5 seconds:
   * - compute next index (wrap back to 0 at the end)
   * - scroll the FlatList to the correct offset
   * - update currentIndexRef so the next tick continues correctly
   *
   * Cleanup:
   * - clearInterval when component unmounts to avoid memory leaks.
   */
  useEffect(() => {
    const autoSlideTimer = setInterval(() => {
      // Next index loops back to 0 after the last slide.
      const nextIndex = (currentIndexRef.current + 1) % slides.length;

      // Scroll horizontally to the slide's left edge (index * screen width).
        description:
          "Set and track progress toward your financial goals. Stay motivated with visual progress indicators.",
        iconLibrary: "MaterialCommunityIcons",
        iconName: "target",
        iconColor: "#EA580C",
        iconBg: "#FDEAD7",
      },
      {
        key: "alerts",
        title: "Smart Alerts",
        description:
          "Receive intelligent notifications about unusual spending, upcoming bills, and budget warnings.",
        iconLibrary: "Ionicons",
        iconName: "notifications-outline",
        iconColor: "#CA8A04",
        iconBg: "#FEF3C7",
      },
      {
        key: "dashboard",
        title: "Financial Dashboard",
        description:
          "View all your financial data at a glance. Beautiful charts and insights help you make better decisions.",
        iconLibrary: "MaterialCommunityIcons",
        iconName: "view-dashboard-outline",
        iconColor: "#4F46E5",
        iconBg: "#E0E7FF",
      },
    ],
    []
  );

  // Auto-scroll effect for the onboarding carousel.
  // Every 4.5 seconds, the list moves to the next slide.
  useEffect(() => {
    const autoSlideTimer = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % slides.length;

      flatListRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_WIDTH,
        animated: true,
      });

      // Persist current index for the next interval tick.
      currentIndexRef.current = nextIndex;
    }, 5000);

    return () => clearInterval(autoSlideTimer);
  }, [slides.length]);

  /**
   * renderSlide
   * -----------
   * Renders one slide and applies subtle scroll-driven animations:
   * - opacity: center slide is brightest
   * - scale: center slide is slightly larger
   * - translateY: center slide sits slightly higher (lift effect)
   */
      currentIndexRef.current = nextIndex;
    }, 4500);

    // Clean up the timer when the component unmounts.
    return () => clearInterval(autoSlideTimer);
  }, [slides.length]);

  // Helper function to manually jump to a specific slide.
  // This is used by the preview chips below the carousel.
  const goToSlide = (index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * SCREEN_WIDTH,
      animated: true,
    });
    currentIndexRef.current = index;
  };

  // Renders the icon for a slide based on which icon library the slide uses.
  const renderIcon = (item: FeatureSlide) => {
    if (item.iconLibrary === "Ionicons") {
      return (
        <Ionicons
          name={item.iconName as keyof typeof Ionicons.glyphMap}
          size={34}
          color={item.iconColor}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={item.iconName as any}
        size={34}
        color={item.iconColor}
      />
    );
  };

  // Renders each individual onboarding card in the FlatList.
  const renderSlide = ({
    item,
    index,
  }: {
    item: FeatureSlide;
    index: number;
  }) => {
    /**
     * inputRange
     * ----------
     * Defines a 3-point window for interpolation:
     * [previous slide offset, current slide offset, next slide offset]
     */
    // Input range based on the slide's position in the horizontal list.
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    // Fade in at center; fade out on either side.
    // Fades side cards slightly so the active card stands out more.
    const slideOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.45, 1, 0.45],
      extrapolate: "clamp",
    });

    // Slight zoom on the centered slide.
    const slideScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    // Small vertical lift for the centered slide.
    // Slightly scales down neighboring cards.
    const slideScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: "clamp",
    });

    // Adds a subtle vertical movement effect while swiping.
    const slideTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        // Animated container allows opacity/transform updates during scroll.
        style={[
          styles.slide,
          {
            opacity: slideOpacity,
            transform: [{ scale: slideScale }, { translateY: slideTranslateY }],
          },
        ]}
      >
        {/* Slide text content */}
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </Animated.View>
    );
  };

  return (
    /**
     * SafeAreaView
     * ------------
     * Keeps content out of the status bar / notch.
     * edges={["top"]} pads only the top safe area.
     *
     * Note: styles.safeArea includes paddingTop: 45 which adds additional
     * spacing beyond safe area. If the layout feels too low, reduce it.
     */
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {/* Root layout: branding header + carousel + CTA section */}
      <View style={styles.root}>
        {/* ======================================================
           HEADER / BRANDING
           ====================================================== */}
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* App icon (local asset). Ensure the path matches your project. */}
            <Image
              source={require("../assets/letter-m (1).png")}
              style={styles.brandIcon}
            />

            {/* App name / logo text */}
            <Text style={styles.logoText}>Money Mentor</Text>
          </View>
        </View>

        {/* ======================================================
           CAROUSEL SECTION
           Animated.FlatList + pagination indicator
           ====================================================== */}
        <View style={styles.contentSection}>
          <Animated.FlatList
            // Ref enables scrollToOffset for auto-advance.
      <View style={styles.slide}>
        <Animated.View
          style={[
            styles.cardShell,
            {
              opacity: slideOpacity,
              transform: [{ scale: slideScale }, { translateY: slideTranslateY }],
            },
          ]}
        >
          {/* Colored square behind the icon */}
          <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
            {renderIcon(item)}
          </View>

          {/* Feature title */}
          <Text style={styles.slideTitle}>{item.title}</Text>

          {/* Feature description */}
          <Text style={styles.slideDescription}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  // Moves the active pagination dot as the user scrolls through the carousel.
  const activeDotTranslateX = scrollX.interpolate({
    inputRange: slides.map((_, index) => index * SCREEN_WIDTH),
    outputRange: slides.map((_, index) => index * DOT_STEP),
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.root}>
        {/* Background accent circles used to make the landing page feel less flat */}
        <View style={styles.gradientBgTop} />
        <View style={styles.gradientBgBottom} />

        {/* Main branding and intro text */}
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>$</Text>
          </View>

          <Text style={styles.logoText}>Money Mentor</Text>
          <Text style={styles.heroTitle}>Take control of your finances.</Text>
          <Text style={styles.heroSubtitle}>
            Budget smarter, track spending, get alerts, and use AI-powered tools
            to make better money decisions.
          </Text>
        </View>

        {/* Carousel section */}
        <View style={styles.contentSection}>
          <Animated.FlatList
            ref={flatListRef}
            data={slides}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderSlide}
            /**
             * onScroll ties the native scroll position into scrollX.
             * useNativeDriver: true keeps updates on the native thread for smoothness.
             */
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true }
            )}
            // How often scroll events are fired (16ms ~= 60fps).
            scrollEventThrottle={16}
            // Reduce bounce/overscroll for a tighter onboarding experience.
            bounces={false}
            overScrollMode="never"
            // Reduce "coasting" between pages for snappier paging.
            disableIntervalMomentum
            decelerationRate="fast"
            /**
             * getItemLayout helps FlatList calculate offsets without measuring items.
             * Improves performance and makes scrollToOffset more reliable.
             */
            scrollEventThrottle={16}
            bounces={false}
            overScrollMode="never"
            disableIntervalMomentum
            decelerationRate="fast"
            snapToAlignment="center"
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            /**
             * When swipe motion finishes, compute the snapped-to page index
             * and persist it for the auto-advance timer.
             */
            onMomentumScrollEnd={(event) => {
            onMomentumScrollEnd={(event) => {
              // Update the current slide index after manual swiping.
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              currentIndexRef.current = index;
            }}
          />

          {/* ======================================================
             PAGINATION
             - Static dots rendered in a row
             - Active indicator animates across dots based on scrollX
             ====================================================== */}
          <View
            style={[
              styles.pagination,
              {
                // Explicit width keeps dots truly centered.
                width:
                  slides.length * DOT_SIZE + (slides.length - 1) * DOT_GAP,
              },
            ]}
          >
            {/* Inactive dots */}
            {slides.map((slide, index) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  // Apply right margin except on the final dot.
                  { marginRight: index === slides.length - 1 ? 0 : DOT_GAP },
                ]}
              />
            ))}

            {/* Active indicator (moves in DOT_STEP increments as you scroll pages) */}
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {slides.map((slide) => (
              <View key={slide.key} style={styles.dot} />
            ))}

            {/* Animated active dot */}
            <Animated.View
              style={[
                styles.dotActive,
                {
                  transform: [
                    {
                      translateX: scrollX.interpolate({
                        inputRange: [0, (slides.length - 1) * SCREEN_WIDTH],
                        outputRange: [0, (slides.length - 1) * DOT_STEP],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                  transform: [{ translateX: activeDotTranslateX }],
                },
              ]}
            />
          </View>
        </View>

        {/* ======================================================
           BOTTOM CTA SECTION
           - Primary: Sign Up
           - Secondary: Sign In
           ====================================================== */}
        <View style={styles.bottomSection}>
          {/* Primary CTA navigates to signup */}
        {/* Bottom action area with preview chips and auth buttons */}
        <View style={styles.bottomSection}>
          <View style={styles.previewRow}>
            {slides.map((slide, index) => (
              <Pressable
                key={slide.key}
                onPress={() => goToSlide(index)}
                style={styles.previewChip}
              >
                <Text style={styles.previewChipText}>{slide.title}</Text>
              </Pressable>
            ))}
          </View>

          {/* Main call-to-action button */}
          <Pressable
            style={styles.ctaButton}
            onPress={() => router.push("/signup")}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Get Started for Free</Text>
          </Pressable>

          {/* Secondary CTA navigates to login */}
          <TouchableOpacity
            style={styles.secondarySignIn}
            onPress={() => router.push("/login")}
            activeOpacity={0.75}
            accessibilityRole="button"
          {/* Secondary sign-in button for returning users */}
          <TouchableOpacity
            onPress={() => router.push("/login")}
            activeOpacity={0.75}
            accessibilityRole="button"
            style={styles.secondarySignIn}
          >
            <Text style={styles.secondarySignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/**
 * ==========================================================
 * STYLES
 * ==========================================================
 * Organized by:
 * - layout containers (safeArea, root, header, contentSection, bottomSection)
 * - slide typography (slide, slideTitle, slideDescription)
 * - pagination (pagination, dot, dotActive)
 * - CTAs (ctaButton, ctaText, secondarySignIn, secondarySignInText)
 */
const styles = StyleSheet.create({
  // Top-level SafeArea container.
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Main page container inside the safe area.
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Header container (brand row).
// Styles for the landing page screen.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingTop: 4,
    paddingBottom: 24,
  },

  // Decorative circle in the top-right background.
  gradientBgTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    opacity: 0.8,
  },

  // Decorative circle in the lower-left background.
  gradientBgBottom: {
    position: "absolute",
    bottom: 90,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 999,
    backgroundColor: "#EDE9FE",
    opacity: 0.65,
  },

  // Branding/header section at the top of the screen.
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 14,
    marginTop: 0,
  },

  // Brand row: icon + app name.
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // Brand icon sizing.
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },

  // Brand text styling.
  logoText: {
    color: "#101828",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Carousel + pagination section: takes remaining vertical space.
    marginBottom: 10,
  },

  // Blue logo block used as a temporary Money Mentor brand mark.
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  brandBadgeText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },

  logoText: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 10,
  },

  heroTitle: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.5,
  },

  heroSubtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 340,
  },

  // Main middle section that holds the carousel.
  contentSection: {
    flex: 1,
    justifyContent: "center",
  },

  // Bottom CTA section spacing.
  bottomSection: {
    paddingBottom: 12,
  },

  // Slide container: full device width so paging snaps correctly.
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },

  // Slide title typography.
  slideTitle: {
    color: "#111827",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.4,
  },

  // Slide description typography.
  slideDescription: {
    color: "#475467",
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 320,
  },

  // Pagination container: dots row centered beneath slides.
  // Each slide takes up the full device width.
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // The large rounded white card for each feature.
  cardShell: {
    width: "86%",
    minHeight: 470,
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 34,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  // Colored icon box at the top of each card.
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },

  slideTitle: {
    color: "#0F172A",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: -0.4,
  },

  slideDescription: {
    color: "#475569",
    fontSize: 17,
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 280,
  },

  // Container for the pagination dots.
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    position: "relative",
    marginTop: 28,
    marginBottom: 30,
  },

  // Inactive dot appearance.
    marginTop: 24,
    marginBottom: 18,
  },

  // Inactive pagination dot.
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
  },

  // Active dot indicator (currently same width as DOT_SIZE).
  // left recenters the indicator over each dot position.
  dotActive: {
    position: "absolute",
    left: -(ACTIVE_DOT_WIDTH - DOT_SIZE) / 2,
    width: ACTIVE_DOT_WIDTH,
    height: DOT_SIZE,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
  },

  // Primary CTA button styling.
  ctaButton: {
    marginHorizontal: 25,
    height: 56,
    backgroundColor: "#CBD5E1",
    marginRight: DOT_GAP,
  },

  // Active pagination dot that animates left and right.
  dotActive: {
    position: "absolute",
    top: 0,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },

  // Bottom section containing preview chips and action buttons.
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  // Row of quick-jump chips that let the user tap to a specific feature card.
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },

  previewChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  previewChipText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },

  // Main sign-up button.
  ctaButton: {
    height: 58,
    borderRadius: 40,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",

    // iOS shadow.
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    // Android shadow.
    elevation: 3,
  },

  // CTA label styling.
    elevation: 3,
  },

  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  // Secondary action spacing and touch target.
  secondarySignIn: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  // Secondary action label.
  secondarySignInText: {
    color: "#344054",
    fontSize: 16,
    fontWeight: "600",
  // Secondary sign-in text button below the main CTA.
  secondarySignIn: {
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  secondarySignInText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "700",
  },
});

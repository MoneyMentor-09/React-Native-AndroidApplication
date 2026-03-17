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
  const slides = useMemo<FeatureSlide[]>(
    () => [
      {
        key: "budgeting",
        title: "Smart Budgeting",
        description: "Create and track budgets. Get real-time alerts.",
      },
      {
        key: "tracking",
        title: "Transaction Tracking",
        description: "Automatically categorize and track all your expenses.",
      },
      {
        key: "advisor",
        title: "AI Financial Advisor",
        description: "Personalized financial advice powered by AI.",
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
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    // Fade in at center; fade out on either side.
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
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    position: "relative",
    marginTop: 28,
    marginBottom: 30,
  },

  // Inactive dot appearance.
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
  },
});

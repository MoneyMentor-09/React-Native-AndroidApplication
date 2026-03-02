import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router"; // removed useNavigation import since we can use router directly

/**
 * Screen width is used to size each onboarding "page" exactly to the device width
 * so that pagingEnabled snaps cleanly between slides.
 */
const [screen_width, setWidth] = useState(window.innerWidth);

/**
 * Pagination dot geometry:
 * - DOT_SIZE: diameter of each inactive dot
 * - DOT_GAP: spacing between dots
 * - DOT_STEP: total horizontal distance from one dot center to the next
 * - ACTIVE_DOT_WIDTH: the active indicator is a pill (wider than DOT_SIZE)
 */
const DOT_SIZE = 8;
const DOT_GAP = 10;
const DOT_STEP = DOT_SIZE + DOT_GAP;
const ACTIVE_DOT_WIDTH = 22;

/**
 * Strongly-typed shape of each onboarding slide.
 * key: unique id used by FlatList
 * title/description: text displayed on each page
 */
type FeatureSlide = {
  key: string;
  title: string;
  description: string;
  // icon?: string; // Optional placeholder if you later add icons
};

export default function InitialScreen() {
  /**
   * Expo Router navigation object.
   * Note:
   * - You already use router.push("/signup") in the CTA
   * - useNavigation() is used below for the "Sign In" button.
   *
   * In Expo Router you can standardize on router.push("/login") instead of
   * mixing router and navigation to avoid type casts.
   */
  // const navigation = useNavigation();

  /**
   * Animated value representing horizontal scroll offset in pixels.
   * This drives the active pagination indicator (dotActive) movement.
   *
   * useRef keeps the same Animated.Value instance across re-renders.
   */
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<Animated.FlatList<FeatureSlide> | null>(null);
  const currentIndexRef = useRef(0);

  /**
   * Slides are memoized so the array reference stays stable
   * (prevents FlatList from unnecessary re-renders).
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

    const [screen_width, setWidth] = useState(window.innerWidth);

    /**
     * Timer effect for slide transistions.
     */
  useEffect(() => {
    const autoSlideTimer = setInterval(() => {
      const nextIndex = (currentIndexRef.current + 1) % slides.length;
      flatListRef.current?.scrollToOffset({
          offset: nextIndex * screen_width,
        animated: true,
      });
      currentIndexRef.current = nextIndex;
    }, 5000);

    return () => clearInterval(autoSlideTimer);
  }, [slides.length, screen_width]);

  /**
   * Window resize effect
   */
    useEffect(() => {
        function handleResize() {
            setWidth(window.innerWidth);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [])
  /**
   * Renders one slide/page in the horizontal FlatList.
   * Each slide has width = screen_width so paging snaps exactly one slide at a time.
   */
  const renderSlide = ({
    item,
    index,
  }: {
    item: FeatureSlide;
    index: number;
      }) => {
    const inputRange = [
        (index - 1) * screen_width,
        index * screen_width,
        (index + 1) * screen_width,
    ];
    const slideOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.45, 1, 0.45],
      extrapolate: "clamp",
    });
    const slideScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });
    const slideTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.slide,
          {
            width: screen_width,
            opacity: slideOpacity,
            transform: [{ scale: slideScale }, { translateY: slideTranslateY }],
          },
        ]}
      >
        {/* Placeholder for a future icon or illustration
        <View style={styles.iconPlaceholder}>
          <Text style={styles.iconText}>{item.icon}</Text>
        </View>
        */}
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </Animated.View>
    );
  };

  return (
    /**
     * SafeAreaView keeps content out of the notch/status bar areas.
     */
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        {/* Header area (currently mostly commented-out). */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={require("../assets/letter-m (1).png")} style={styles.brandIcon} />
            <Text style={styles.logoText}>Money Mentor</Text>
          </View>
        </View>

        {/**
         * Animated.FlatList
         * - horizontal + pagingEnabled: gives a swipeable onboarding carousel
         * - onScroll updates scrollX which drives pagination animation
         * - getItemLayout improves performance by letting FlatList compute offsets
         */}
        <View style={styles.contentSection}>
          <Animated.FlatList
            ref={flatListRef}
            data={slides}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={renderSlide}
            onScroll={
              /**
               * Animated.event maps the native scroll position into scrollX.
               * useNativeDriver: true makes this animation run on the native thread.
               *
               * Note: Here we only animate transform translateX (supported by native driver).
               */
              Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                useNativeDriver: true,
              })
            }
            scrollEventThrottle={16} // ~60fps updates
            bounces={false} // disables bounce at ends (iOS)
            disableIntervalMomentum // reduces "coasting" between pages
            overScrollMode="never" // disables glow/overscroll (Android)
            decelerationRate="fast" // makes snapping feel tighter
            getItemLayout={(_, index) => ({
                length: screen_width,
                offset: screen_width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screen_width);
              currentIndexRef.current = index;
            }}
          />

          {/**
           * Pagination row
           * - renders inactive dots
           * - overlays an Animated "pill" (dotActive) that slides horizontally as user swipes
           */}
          <View
            style={[
              styles.pagination,
              {
                // Total width = (dots * DOT_SIZE) + (gaps between dots)
                width: slides.length * DOT_SIZE + (slides.length - 1) * DOT_GAP,
              },
            ]}
          >
            {/* Render inactive dots */}
            {slides.map((slide, index) => (
              <View
                key={slide.key}
                style={[
                  styles.dot,
                  { marginRight: index === slides.length - 1 ? 0 : DOT_GAP },
                ]}
              />
            ))}

            {/* Active indicator pill that animates based on scrollX */}
            <Animated.View
              style={[
                styles.dotActive,
                {
                  transform: [
                    {
                      /**
                       * Convert scroll offset (pixels) into dot-step offset.
                       * inputRange: 0 -> last slide offset
                       * outputRange: 0 -> last dot position
                       */
                      translateX: scrollX.interpolate({
                        inputRange: [0, (slides.length - 1) * screen_width],
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

        {/**
         * Primary CTA: routes user to signup.
         * router.push adds to history stack; use replace if you don't want back navigation.
         */}
        <View style={styles.bottomSection}>
          <Pressable style={styles.ctaButton} onPress={() => router.push("/signup")}>
            <Text style={styles.ctaText}>Get Started for Free</Text>
          </Pressable>

        {/**
         * Secondary action: Sign In
         * Currently uses navigation.navigate with a type cast.
         *
         * In Expo Router, you can simplify to: router.push("/login")
         * and remove useNavigation entirely (cleaner + no casting).
         */}
          <TouchableOpacity
            style={styles.secondarySignIn}
            onPress={() => router.push("/login")}
            activeOpacity={0.75}
          >
            <Text style={styles.secondarySignInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignContent: "center",
    paddingTop: 45,
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  bottomSection: {
    paddingTop: 16,
    paddingBottom: 12,
  },

  contentSection: {
    flex: 1,
    justifyContent: "center",
  },

  /**
   * root defines the page background and vertical spacing.
   */
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    paddingBottom: 24,
  },

  /**
   * Header row: optional branding and top-right actions.
   */
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 14,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },

  logoText: {
    color: "#101828",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // Container for "Skip" / "Sign In" header actions (currently unused)
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  skipText: {
    color: "#475467",
    fontSize: 14,
    fontWeight: "600",
  },

  // Outlined button style for sign-in (header)
  signInButton: {
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },

  signInText: {
    color: "#1D2939",
    fontSize: 14,
    fontWeight: "700",
  },

  /**
   * Each slide occupies full width and centers content.
   * paddingBottom gives spacing away from pagination area.
   */
  slide: {
    width: screen_width,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },

  /**
   * Placeholder styling for a future icon/illustration block.
   */
  iconPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#DDE6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },

  iconText: {
    color: "#1D4ED8",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  slideTitle: {
    color: "#111827",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.4,
  },

  slideDescription: {
    color: "#475467",
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
    maxWidth: 320, // keeps text from becoming too wide on tablets
  },

  /**
   * Pagination container is centered and relative so the active pill
   * can be absolutely positioned on top.
   */
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    position: "relative",
    marginTop: 28,
    marginBottom: 30,
  },

  // Inactive dots
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#D0D5DD",
  },

  /**
   * Active dot pill:
   * left offset recenters the wider pill over the dot location.
   * translateX animation moves it across dot positions.
   */
  dotActive: {
    position: "absolute",
    left: -(ACTIVE_DOT_WIDTH - DOT_SIZE) / 2,
    width: ACTIVE_DOT_WIDTH,
    height: DOT_SIZE,
    borderRadius: 999,
    backgroundColor: "#1D4ED8",
  },

  /**
   * Primary CTA button
   */
  ctaButton: {
    marginHorizontal: 25,
    height: 56,
    borderRadius: 40,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3, // Android shadow
  },

  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  /**
   * Secondary sign-in link under CTA.
   * TouchableOpacity gives built-in pressed opacity feedback.
   */
  secondarySignIn: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  secondarySignInText: {
    color: "#344054",
    fontSize: 16,
    fontWeight: "600",
  },
});

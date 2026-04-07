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

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    Animated,
    Dimensions,
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    Image,
} from "react-native";

// SafeAreaView prevents content from overlapping device notch/status bar.
import { SafeAreaView } from "react-native-safe-area-context";

// Expo Router API for navigation between screens in an Expo Router project.
// router.push("/signup") pushes a new route onto the stack.
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";

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
const SLIDE_HORIZONTAL_GUTTER = 22;
const MAX_SLIDE_CARD_WIDTH = 380;

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

    /**
    * Screen width is used to size each onboarding "page" exactly to the device width
    * so that pagingEnabled snaps cleanly between slides.
    */
    const { height, width } = useWindowDimensions();

    // Use container-measured width (onLayout) but initialize from useWindowDimensions
    const [layoutWidth, setLayoutWidth] = useState<number>(Math.round(width));
    const resizeTimeoutRef = useRef<any>(null);

    /**
    * Unlocks screen orientation
    */
    useEffect(() => {
        const unlockScreenOrientation = async () => {
            await ScreenOrientation.unlockAsync()
        }
        unlockScreenOrientation()
    }, [])

    const handleLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const w = Math.round(e.nativeEvent.layout.width || width);
            if (!w || w === layoutWidth) return;

            // debounce quick succession layout changes (rotation, split-screen)
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
            resizeTimeoutRef.current = setTimeout(() => {
                const index = currentIndexRef.current;
                setLayoutWidth(w);

                // Jump to same slide using new width, no animation
                flatListRef.current?.scrollToOffset({ offset: index * w, animated: false });

                // Keep Animated.Value consistent with the new offset
                scrollX.setValue(index * w);

                resizeTimeoutRef.current = null;
            }, 50);
        },
        [layoutWidth, scrollX, width]
    );

    useEffect(() => {
        return () => {
            if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
        };
    }, []);

    /**
    * Keep FlatList position and scrollX in sync when orientation (layoutWidth) changes.
    * This ensures the carousel stays on the same slide after rotation.
    */
    useEffect(() => {
        const index = currentIndexRef.current;

        // Jump to the same slide using the new width (no animation)
        setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: index * layoutWidth, animated: false })
        }, 0)

        // Keep scrollX consistent with the new offset
        scrollX.setValue(index * layoutWidth);
    }, [layoutWidth, scrollX]);

    // Memoized array of feature slides shown on the landing page.
    // useMemo keeps this array from being recreated on every render.
    const slides = useMemo<FeatureSlide[]>(
        () => [
            {
                key: "budgeting",
                title: "Smart Budgeting",
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
                offset: nextIndex * layoutWidth,
                animated: true,
            });

            currentIndexRef.current = nextIndex;
        }, 4500);

        // Clean up the timer when the component unmounts.
        return () => clearInterval(autoSlideTimer);
    }, [slides.length]);

    // Helper function to manually jump to a specific slide.
    // This is used by the preview chips below the carousel.
    const goToSlide = (index: number) => {
        flatListRef.current?.scrollToOffset({
            offset: index * layoutWidth,
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
        // Input range based on the slide's position in the horizontal list.
        const inputRange = [
            (index - 1) * layoutWidth,
            index * layoutWidth,
            (index + 1) * layoutWidth,
        ];

        // Fades side cards slightly so the active card stands out more.
        const slideOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.45, 1, 0.45],
            extrapolate: "clamp",
        });

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

        const cardWidth = Math.min(
            layoutWidth - SLIDE_HORIZONTAL_GUTTER * 2,
            MAX_SLIDE_CARD_WIDTH
        );

        return (
            <View style={[styles.slide, { width: layoutWidth }]}>
                <Animated.View
                    style={[
                        styles.cardShell,
                        {
                            width: cardWidth,
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
        inputRange: slides.map((_, index) => index * layoutWidth),
        outputRange: slides.map((_, index) => index * DOT_STEP),
        extrapolate: "clamp",
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            <View style={styles.root} onLayout={handleLayout}>
                {/* Background accent circles used to make the landing page feel less flat */}
                <View style={styles.gradientBgTop} />
                <View style={styles.gradientBgBottom} />

                {/* Main branding and intro text */}
                <View style={styles.header}>
                    <View style={styles.brandBadge}>
                        <Image source={require("../assets/letter-m (1).png")} style={styles.brandImage} />
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
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        scrollEventThrottle={16}
                        bounces={false}
                        overScrollMode="never"
                        disableIntervalMomentum
                        decelerationRate="fast"
                        snapToAlignment="center"
                        getItemLayout={(_, index) => ({
                            length: layoutWidth,
                            offset: layoutWidth * index,
                            index,
                        })}
                        onMomentumScrollEnd={(event) => {
                            // Update the current slide index after manual swiping.
                            const index = Math.round(
                                event.nativeEvent.contentOffset.x / layoutWidth
                            );
                            currentIndexRef.current = index;
                        }}
                    />

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
                                    transform: [{ translateX: activeDotTranslateX }],
                                },
                            ]}
                        />
                    </View>
                </View>

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
        marginBottom: 10,
    },

    // Blue logo block used as a temporary Money Mentor brand mark.
    brandBadge: {
        width: 75,
        height: 75,
        borderRadius: 16,
        backgroundColor: "#1D4ED8",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        marginTop: 10,
        shadowColor: "#1D4ED8",
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },

     brandImage: {
    width: 74,
    height: 74,
  },    

    logoText: {
        color: "#0F172A",
        fontSize: 40,
        fontWeight: "800",
        letterSpacing: -0.4,
        marginBottom: 8,
    },

    heroTitle: {
        color: "#0F172A",
        fontSize: 22,
        lineHeight: 36,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 10,
        letterSpacing: -0.5,
    },

    heroSubtitle: {
        color: "#475569",
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
        maxWidth: 340,
    },

    // Main middle section that holds the carousel.
    contentSection: {
        flex: 1,
        justifyContent: "flex-start",
        paddingTop: 18,
    },

    // Each slide takes up the full device width.
    slide: {
        paddingHorizontal: SLIDE_HORIZONTAL_GUTTER,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 18,
        paddingBottom: 20,
    },

    // The large rounded white card for each feature.
    cardShell: {
        width: "86%",
        minHeight: 420,
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 26,
        paddingBottom: 28,
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
        width: 84,
        height: 84,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },

    slideTitle: {
        color: "#0F172A",
        fontSize: 25,
        lineHeight: 30,
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 14,
        letterSpacing: -0.4,
    },

    slideDescription: {
        color: "#475569",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        maxWidth: 270,
    },

    // Container for the pagination dots.
    pagination: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        position: "relative",
        marginTop: 20,
        marginBottom: 18,
    },

    // Inactive pagination dot.
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: 999,
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
        marginBottom: 15,
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
        shadowColor: "#1D4ED8",
        shadowOpacity: 0.24,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },

    ctaText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "800",
    },

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

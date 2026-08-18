import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import {
  NavigationContext,
  getMainTabForScreen,
  scanFlowScreens,
  type FloatingAction,
  type FloatingButtonVariant,
  type MainTab,
} from '../../navigation/AppNavigationContext';
import { TrashOutlineIcon } from '../../flows/storage';
import { Logo } from '../../flows/login';
import { styles } from '../../styles/appStyles';
import { mutedText, navy } from '../../styles/theme';

type FontAwesome5Name = React.ComponentProps<typeof FontAwesome5>['name'];

export function ScreenShell({
  title,
  subtitle,
  children,
  noNav,
  compactTop,
  onBack,
  closeIcon,
  hideBack,
  tightBottom,
  titleIcon,
  disableScroll,
  hideFloatingScan,
  floatingAction,
  tintBackground,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  noNav?: boolean;
  compactTop?: boolean;
  onBack?: () => void;
  closeIcon?: boolean;
  hideBack?: boolean;
  tightBottom?: boolean;
  titleIcon?: MainTab;
  disableScroll?: boolean;
  hideFloatingScan?: boolean;
  floatingAction?: FloatingAction | FloatingAction[];
  tintBackground?: boolean;
}) {
  const navigation = useContext(NavigationContext);
  const handleBack = hideBack ? undefined : onBack ?? navigation?.back;
  const floatingActions = floatingAction ? (Array.isArray(floatingAction) ? floatingAction : [floatingAction]) : [];
  const shouldShowFloatingScan =
    !noNav &&
    !hideFloatingScan &&
    floatingActions.length === 0 &&
    !navigation?.scanResultPending &&
    navigation?.currentTab !== 'settings' &&
    !scanFlowScreens.has(navigation?.current ?? 'initial');

  return (
    <View style={[styles.shell, tintBackground && styles.shellTint]}>
      {title ? (
        <View style={[styles.header, hideBack && styles.headerNoBack]}>
          <DeviceStatusBar compact />
          <View
            style={[
              styles.headerTitleRow,
              hideBack && styles.headerTitleRowNoBack,
              !subtitle && styles.headerTitleRowSingle,
            ]}
          >
            {handleBack ? (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backGlyph}>{closeIcon ? '×' : '‹'}</Text>
              </Pressable>
            ) : hideBack ? null : (
              <View style={styles.backButton} />
            )}
            <View style={styles.headerText}>
              <View style={styles.headerTitleContent}>
                {titleIcon ? (
                  <View style={styles.headerTitleIcon}>
                    <NavIcon type={titleIcon} active />
                  </View>
                ) : null}
                <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                  {title}
                </Text>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          <View style={styles.headerInsetRule} />
        </View>
      ) : (
        <DeviceStatusBar />
      )}
      {disableScroll ? (
        <View
          style={[
            styles.content,
            styles.contentInner,
            compactTop && styles.contentInnerCompact,
            tightBottom && styles.contentInnerTightBottom,
          ]}
        >
          {children}
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            compactTop && styles.contentInnerCompact,
            tightBottom && styles.contentInnerTightBottom,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
        >
          {children}
        </ScrollView>
      )}
      {floatingActions.map((action, index) => (
        <FloatingScanButton
          key={`${action.variant}-${index}`}
          variant={action.variant}
          onPress={action.onPress}
          small={action.small}
          offsetIndex={floatingActions.length - index - 1}
        />
      ))}
      {shouldShowFloatingScan ? <FloatingScanButton /> : null}
      {!noNav ? <BottomNav /> : null}
    </View>
  );
}

function DeviceStatusBar({ compact }: { compact?: boolean }) {
  return <View style={compact ? styles.statusBarRow : styles.statusOnly} />;
}

function BottomNav() {
  const navigation = useContext(NavigationContext);
  const current = navigation?.current ?? 'home';
  const currentTab = navigation?.currentTab ?? getMainTabForScreen(current);

  return (
    <View style={styles.bottomNav}>
      <NavButton label="홈" type="home" active={currentTab === 'home'} onPress={() => navigation?.navigateTab('home')} />
      <NavButton label="정리함" type="storage" active={currentTab === 'storage'} onPress={() => navigation?.navigateTab('storage')} />
      <NavButton label="휴지통" type="trash" active={currentTab === 'trash'} onPress={() => navigation?.navigateTab('trash')} />
      <NavButton label="스캔 이력" type="history" active={currentTab === 'history'} onPress={() => navigation?.navigateTab('history')} />
      <NavButton label="설정" type="settings" active={currentTab === 'settings'} onPress={() => navigation?.navigateTab('settings')} />
    </View>
  );
}

function NavButton({
  label,
  type,
  active,
  onPress,
}: {
  label: string;
  type: MainTab;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navButton} onPress={onPress}>
      <NavIcon type={type} active={Boolean(active)} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function FloatingScanButton({
  variant = 'scan',
  onPress,
  small,
  offsetIndex = 0,
}: {
  variant?: FloatingButtonVariant;
  onPress?: () => void;
  small?: boolean;
  offsetIndex?: number;
}) {
  const navigation = useContext(NavigationContext);
  const isTrash = variant === 'trash';
  const isDelete = variant === 'delete';
  const isRestore = variant === 'restore';

  return (
    <Pressable
      style={[
        styles.floatingScanButton,
        { bottom: 78 + offsetIndex * 64 },
        small && styles.floatingSmallButton,
        isDelete && styles.floatingDeleteButton,
        isTrash && styles.floatingTrashButton,
        isRestore && styles.floatingRestoreButton,
      ]}
      onPress={onPress ?? (() => navigation?.navigate('scanFlowSource'))}
    >
      {isRestore ? <FontAwesome5 name="undo-alt" size={small ? 18 : 22} color={mutedText} /> : null}
      {isTrash || isDelete ? (
        <TrashOutlineIcon danger={isTrash} muted={isDelete} compact />
      ) : !isRestore ? (
        <AntDesign name="scan" size={30} color={navy} />
      ) : null}
    </Pressable>
  );
}

function NavIcon({ type, active }: { type: MainTab; active: boolean }) {
  const iconName: Record<MainTab, FontAwesome5Name> = {
    home: 'home',
    storage: 'archive',
    trash: 'trash-alt',
    history: 'chart-line',
    settings: 'cog',
  };

  return (
    <View style={styles.navIconFrame}>
      <FontAwesome5 name={iconName[type]} size={23} color={active ? navy : mutedText} solid />
    </View>
  );
}

export function AuraGradientWord({ size = 27 }: { size?: number }) {
  const gradientId = useRef(`auraGradientText-${Math.random().toString(36).slice(2)}`).current;
  const width = size * 3.25;
  const height = size + 10;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2={width} y2="0">
          <Stop offset="0" stopColor="#35C878" />
          <Stop offset="0.52" stopColor="#8DECA8" />
          <Stop offset="1" stopColor="#3FBF75" />
        </SvgLinearGradient>
      </Defs>
      <SvgText x={width / 2} y={size + 1} fill={`url(#${gradientId})`} fontSize={size} fontWeight="900" textAnchor="middle">
        AURA
      </SvgText>
    </Svg>
  );
}

export function LogoRow() {
  return (
    <View style={styles.logoRow}>
      <Logo />
      <Text style={styles.logoText}>AURA</Text>
    </View>
  );
}

export function ProgressCircle({ progress, compact }: { progress: number; compact?: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1150,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.progressCircle, compact && styles.progressCircleCompact]}>
      <Animated.View
        style={[
          styles.progressSpinnerRing,
          compact && styles.progressSpinnerRingCompact,
          { transform: [{ rotate }] },
        ]}
      />
      <Text style={[styles.progressText, compact && styles.progressTextCompact]}>{progress}%</Text>
    </View>
  );
}

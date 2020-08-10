import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator, Animated, Dimensions, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, PanResponder,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {useNavigation, useNavigationState} from '@react-navigation/native';
import {fetchLeaderboard} from "../api/leaderboard";
import {minifyUserId, sameUserNull, userIdFromBase} from "../helper/user";
import {countriesDistinct, Country, getCountryName, getFlagIcon} from "../helper/flags";
import {ILeaderboardPlayer} from "../helper/data";
import {RootStackProp} from "../../App";
import IconFA from "react-native-vector-icons/FontAwesome";
import IconFA5 from "react-native-vector-icons/FontAwesome5";
import {useLazyApi} from "../hooks/use-lazy-api";
import {createMaterialTopTabNavigator} from "@react-navigation/material-top-tabs";
import {TextLoader} from "./components/loader/text-loader";
import {ImageLoader} from "./components/loader/image-loader";
import {TabBarLabel} from "./components/tab-bar-label";
import {MyText} from "./components/my-text";
import {ITheme, makeVariants, usePaperTheme, useTheme} from "../theming";
import Picker from "./components/picker";
import {setLeaderboardCountry, useMutate, useSelector} from "../redux/reducer";
import TextHeader from "./components/navigation-header/text-header";
import {formatAgo, noop} from "../helper/util";
import RefreshControlThemed from "./components/refresh-control-themed";

type TabParamList = {
    LeaderboardRm1v1: { leaderboardId: number };
    LeaderboardRmTeam: { leaderboardId: number };
    LeaderboardDm1v1: { leaderboardId: number };
    LeaderboardDmTeam: { leaderboardId: number };
    LeaderboardUnranked: { leaderboardId: number };
};

// const Tab = createMaterialTopTabNavigator();
const Tab = createMaterialTopTabNavigator<TabParamList>();


export function leaderboardMenu(props: any) {
    return () => {
        return <LeaderboardMenu/>;
    }
}

const countryEarth = null;

export function LeaderboardMenu() {
    const theme = usePaperTheme();
    const styles = useTheme(variants);
    const mutate = useMutate();
    const country = useSelector(state => state.leaderboardCountry) || null;

    const loadingMatchesOrStats = false;

    const formatCountry = (x: (string | null), inList?: boolean) => {
        if (x == countryEarth) {
            return 'Earth';
        }
        return inList ? getCountryName(x as Country) : x;
    };
    const orderedCountriesDistinct = countriesDistinct.sort((a, b) => formatCountry(a, true).localeCompare(formatCountry(b, true)));
    const countryList: (string | null)[] = [countryEarth, 'DE', ...orderedCountriesDistinct];
    const divider = (x: any, i: number) => i < 2;
    const icon = (x: any) => {
        if (x == countryEarth) {
            return <IconFA name="globe" size={21} style={{paddingLeft: 2, paddingRight: 7}} color={theme.colors.text} />;
        }
        return <Image fadeDuration={0} style={styles.countryIcon} source={getFlagIcon(x)}/>;
    };
    const onCountrySelected = (country: string | null) => {
        mutate(setLeaderboardCountry(country));
    };

    return (
        <View style={styles.menu}>
            <View style={styles.pickerRow}>
                <ActivityIndicator animating={loadingMatchesOrStats} size="small"/>
                <Picker itemHeight={40} textMinWidth={150} flatlist={true} divider={divider} icon={icon} disabled={loadingMatchesOrStats} value={country} values={countryList} formatter={formatCountry} onSelect={onCountrySelected}/>
            </View>
        </View>
    );
}

export function LeaderboardTitle(props: any) {
    return <TextHeader text={'Leaderboard'} onLayout={props.titleProps.onLayout}/>;
}

export default function LeaderboardPage() {
    const styles = useTheme(variants);
    return (
        <Tab.Navigator lazy={true} swipeEnabled={false}>
            <Tab.Screen name="LeaderboardRm1v1" initialParams={{leaderboardId: 3}} options={{tabBarLabel: (x) => <TabBarLabel {...x} title="RM 1v1"/>}}>
                {props => <Leaderboard leaderboardId={props.route?.params?.leaderboardId}/>}
            </Tab.Screen>
            <Tab.Screen name="LeaderboardRmTeam" initialParams={{leaderboardId: 4}} options={{tabBarLabel: (x) => <TabBarLabel {...x} title="RM Team"/>}}>
                {props => <Leaderboard leaderboardId={props.route?.params?.leaderboardId}/>}
            </Tab.Screen>
            <Tab.Screen name="LeaderboardDm1v1" initialParams={{leaderboardId: 1}} options={{tabBarLabel: (x) => <TabBarLabel {...x} title="DM 1v1"/>}}>
                {props => <Leaderboard leaderboardId={props.route?.params?.leaderboardId}/>}
            </Tab.Screen>
            <Tab.Screen name="LeaderboardDmTeam" initialParams={{leaderboardId: 2}} options={{tabBarLabel: (x) => <TabBarLabel {...x} title="DM Team"/>}}>
                {props => <Leaderboard leaderboardId={props.route?.params?.leaderboardId}/>}
            </Tab.Screen>
            <Tab.Screen name="LeaderboardUnranked" initialParams={{leaderboardId: 0}} options={{tabBarLabel: (x) => <TabBarLabel {...x} title="Unr."/>}}>
                {props => <Leaderboard leaderboardId={props.route?.params?.leaderboardId}/>}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

function Leaderboard({leaderboardId}: any) {
    const styles = useTheme(variants);
    const auth = useSelector(state => state.auth!);
    const [refetching, setRefetching] = useState(false);
    const leaderboardCountry = useSelector(state => state.leaderboardCountry) || null;
    const navigation = useNavigation<RootStackProp>();
    const flatListRef = React.useRef<FlatList>(null);
    const [fetchingPage, setFetchingPage] = useState<number>();
    const [contentOffsetY, setContentOffsetY] = useState<number>();

    const currentRouteLeaderboardId = useNavigationState(state => (state.routes[state.index].params as any)?.leaderboardId);

    const getParams = (start: number, count: number, rest: object = {}) => {
        // start -= 1;
        if (leaderboardCountry == countryEarth) {
            return {start, count, ...rest};
        }
        return {start, count, ...rest, country: leaderboardCountry};
    }

    const myRank = useLazyApi(
        {},
        fetchLeaderboard, 'aoe2de', leaderboardId, getParams(1, 1, auth ? minifyUserId(auth) : {})
    );

    const matches = useLazyApi(
        {
            append: (data, newData, args) => {
                const [game, leaderboard_id, params] = args;
                // console.log('APPEND', data, newData, params);
                newData.leaderboard.forEach((value, index) => data.leaderboard[index+params.start!-1] = value);
                console.log('APPENDED', params);
                return data;
            },
        },
        fetchLeaderboard, 'aoe2de', leaderboardId, getParams(1, 100)
    );

    const onRefresh = async () => {
        setRefetching(true);
        await Promise.all([matches.reload(), auth ? myRank.reload() : noop()]);
        setRefetching(false);
    };

    const rowHeight = 50;
    const headerMyRankHeight = myRank.data?.leaderboard.length > 0 ? 64 : 0;
    const headerInfoHeight = 30;
    const headerHeight = headerInfoHeight + headerMyRankHeight;

    const scrollToIndex = (index: number) => {
        flatListRef.current?.scrollToIndex({ animated: true, index: index, viewOffset: -headerHeight-5 });
    };

    useEffect(() => {
        if (currentRouteLeaderboardId != leaderboardId) return;
        if (matches.touched && matches.lastParams?.leaderboardCountry === leaderboardCountry) return;
        matches.reload();
        if (auth) {
            myRank.reload();
        }
        flatListRef.current?.scrollToOffset({ animated: true, offset: 0 });
        // flatListRef.current?.scrollToOffset({ animated: true, offset: 5*rowHeight });
        // flatListRef.current?.scrollToIndex({ animated: true, index: 5 });
        // scrollToIndex(1);
    }, [currentRouteLeaderboardId, leaderboardCountry]);

    const list = matches.data?.leaderboard || [];
    list.length = matches.data?.total || 200;

    const onSelect = async (player: ILeaderboardPlayer) => {
        navigation.push('User', {
            id: userIdFromBase(player),
            name: player.name,
        });
    };

    const _renderRow = (player: ILeaderboardPlayer, i: number, isMyRankRow: boolean = false) => {
        const isMe = sameUserNull(player, auth);
        return (
            <TouchableOpacity style={[styles.row, { height: isMyRankRow ? headerMyRankHeight : rowHeight }]} onPress={() => onSelect(player)}>
                <View style={isMyRankRow ? styles.innerRow : styles.innerRowWithBorder}>
                    <TextLoader style={isMe ? styles.cellRankMe : styles.cellRank}>#{player?.rank || i+1}</TextLoader>
                    <TextLoader style={isMe ? styles.cellRatingMe : styles.cellRating}>{player?.rating}</TextLoader>
                    <View style={styles.cellName}>
                        <ImageLoader style={styles.countryIcon} ready={player} source={getFlagIcon(player?.country)}/>
                        <TextLoader style={isMe ? styles.nameMe : styles.name} numberOfLines={1}>{player?.name}</TextLoader>
                    </View>
                    <TextLoader style={styles.cellGames}>{player?.games} games</TextLoader>
                </View>
            </TouchableOpacity>
        );
    };

    const _renderHeader = () => {
        return (
            <>
                <View style={{height: headerInfoHeight}}>
                    <TouchableOpacity onPress={() => scrollToIndex(myRank.data.leaderboard[0].rank-1)}>
                        <MyText style={styles.info}>
                            {matches.data?.total} players{matches.data?.updated ? ' (updated ' + formatAgo(matches.data.updated) + ')' : ''}
                        </MyText>
                    </TouchableOpacity>
                </View>
                {myRank.data?.leaderboard.length > 0 && _renderRow(myRank.data.leaderboard[0], 0, true)}
            </>
        )
    };

    const pageSize = 100;

    const fetchPage = async (page: number) => {
        if (fetchingPage !== undefined) return;
        if (matches.loading) return;
        console.log('FETCHPAGE', page);
        setFetchingPage(page);
        await matches.refetchAppend('aoe2de', leaderboardId, getParams(page * pageSize + 1, 100));
        setFetchingPage(undefined);
    };

    const fetchByContentOffset = (contentOffsetY: number) => {
        if (!matches.touched) return;
        // console.log('handleOnScroll', index);
        // console.log('handleOnScroll', item);

        contentOffsetY -= headerHeight;

        const index = Math.floor(contentOffsetY/rowHeight);
        const indexTop = Math.max(0, index);
        const indexBottom = Math.min(matches.data.total-1, index+15);
        // console.log('handleOnScrolly', contentOffsetY);
        // console.log('handleOnScroll', index);
        // console.log('handleOnScroll indexBottom', indexBottom);
        // console.log('handleOnScroll matches.data.total', matches.data.total);
        // console.log('handleOnScroll list.length', list.length);

        if (!list[indexTop]) {
            fetchPage(Math.floor(indexTop / pageSize));
            return;
        }
        if (!list[indexBottom]) {
            fetchPage(Math.floor(indexBottom / pageSize));
        }
    };

    useEffect(() => {
        // console.log('useEffect', contentOffsetY, fetchingPage);
        if (contentOffsetY === undefined) return;
        fetchByContentOffset(contentOffsetY);
    }, [contentOffsetY, fetchingPage])

    const handleOnScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // console.log('handleOnScrollEndDrag', event.nativeEvent.contentOffset.y);
        setContentOffsetY(event.nativeEvent.contentOffset.y);
    };

    const handleOnMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // console.log('handleOnMomentumScrollEnd', event.nativeEvent.contentOffset.y);
        setContentOffsetY(event.nativeEvent.contentOffset.y);
    };

    const handleOnScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // console.log('handleOnScroll', event.nativeEvent.contentInset);
        setContentOffsetY(event.nativeEvent.contentOffset.y);
        updateTimer();
        if (!moving.current) {
            position.setValue({x: 0, y: event.nativeEvent.contentOffset.y / (list.length * rowHeight) * 600});
            console.log('ONSCROLL');
        }
    };

    const inactivityTimeout = useRef<any>();
    const opacity = useRef(new Animated.Value(0.3)).current;
    const listLayout = useRef<any>();
    const initialOffsetY = useRef<any>();
    const offsetY = useRef<any>();
    const moving = useRef<any>();
    const [enabled, setEnabled] = useState(false);

    const position = useRef(new Animated.ValueXY()).current;
    const panResponder = React.useMemo(() => PanResponder.create({
        // onStartShouldSetPanResponder: (evt, gestureState) => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => true,
        onPanResponderMove: (evt, gestureState) => {
            // position.setValue({x: position.x._value, y: gestureState.dy});

            // console.log(listLayout.current);
            const min = -(offsetY.current - initialOffsetY.current);
            const max = min + listLayout.current.height - 36*2;

            // console.log('min', min);
            // console.log('max', max);

            // position.setValue({x: gestureState.dx, y: Math.max(-offset.current, gestureState.dy)});
            // position.setValue({x: gestureState.dx, y: gestureState.dy});
            position.setValue({x: gestureState.dx, y: Math.max(Math.min(gestureState.dy, max), -(offsetY.current - initialOffsetY.current))});
            if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
            updateTimer();
        },
        onPanResponderGrant: () => {
            // console.log('OFFSET Y', position.y._value);
            if (initialOffsetY.current === undefined) initialOffsetY.current = position.y._value;
            offsetY.current = position.y._value;
            position.setOffset({
                x: position.x._value,
                y: position.y._value,
            });
            // setMoving(true);
            moving.current = true;
        },
        onPanResponderRelease: (evt, gestureState) => {
            position.flattenOffset();
            // console.log();
            console.log('offset', position.y._value);
            const offset = position.y._value;
            const index = (offset / 600) * list.length;
            console.log('scroll to list.length', list.length);
            console.log('scroll to index', index);
            flatListRef.current?.scrollToOffset({ animated: false, offset: (offset / 600) * list.length * rowHeight });
            // setMoving(false);
            moving.current = false;
            offsetY.current = 0;
        },
    }), []);

    const updateTimer = () => {
        setEnabled(true);
        // opacity.setValue(1);
        if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
        // if (inactivityTimeout.current) inactivityTimeout.current.stop();
        // inactivityTimeout.current = Animated.timing(opacity, {
        //         delay: 2000,
        //         toValue: 0,
        //         duration: 500,
        //         useNativeDriver: false,
        //     });
        // inactivityTimeout.current.start(console.log);
        // inactivityTimeout.current = setTimeout(() => {
        //     const hh = Animated.timing(opacity, {
        //         toValue: 0,
        //         duration: 1000,
        //         useNativeDriver: false,
        //     }).start(console.log);
        //
        //     // opacity.setValue(0.3);
        // }, 2000);
        inactivityTimeout.current = setTimeout(() => setEnabled(false), 2000);
    };

    // console.log('lastMoveTrigger', lastMoveTrigger);
    // console.log('lastMoveTime', lastMoveTime);
    // let enabled = lastMoveTrigger.getTime() - lastMoveTime.getTime() > 500;

    return (
        <View style={styles.container2}>
            <View style={[styles.content, {opacity: matches.loading ? 0.7 : 1}]}>
                {
                    matches.error &&
                    <View style={styles.centered}>
                        <MyText>Error occured when fetching data.</MyText>
                    </View>
                }
                {
                    matches.data?.total === 0 &&
                    <View style={styles.centered}>
                        <MyText>No players listed.</MyText>
                    </View>
                }
                {
                    matches.data?.total !== 0 &&
                    <FlatList
                        ref={flatListRef}
                        onScrollEndDrag={handleOnScrollEndDrag}
                        onMomentumScrollEnd={handleOnMomentumScrollEnd}
                        onScroll={handleOnScroll}
                        onLayout={({nativeEvent: {layout}}: any) => {
                            console.log('ONLAYOUT------------------>');
                            listLayout.current = layout;
                        }}
                        scrollEventThrottle={1000}
                        contentContainerStyle={styles.list}
                        data={list}
                        getItemLayout={(data: any, index: number) => ({length: rowHeight, offset: rowHeight * index, index})}
                        renderItem={({item, index}: any) => _renderRow(item, index)}
                        keyExtractor={(item: { profile_id: any; }, index: any) => (item?.profile_id || index).toString()}
                        refreshControl={
                            <RefreshControlThemed
                                onRefresh={onRefresh}
                                refreshing={refetching}
                            />
                        }
                        ListHeaderComponent={_renderHeader}
                        showsVerticalScrollIndicator={false}
                    />
                }
            </View>
            <View style={styles.draggableContainer} pointerEvents={'box-none'}>
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[{top: position.y, right: -36, opacity: enabled ? 1 : 0}, styles.circle]}>
                    {/*style={[{top: position.y, right: -36, opacity: opacity}, styles.circle]}>*/}

                    <IconFA5 name="arrows-alt-v" size={26} style={styles.arrows}/>
                    {/*<IconFA5 name="caret-up" size={26}/>*/}
                    {/*<IconFA5 name="caret-down" size={26}/>*/}

                    {
                        moving.current &&
                        <View style={styles.textContainer}>
                            <View style={styles.textContainer2}>
                                <AnimDisplay value={position.y} formatter={(offset: number) => ((offset / 600) * list.length).toFixed()} style={styles.text}/>
                            </View>
                        </View>
                    }
                </Animated.View>
            </View>
        </View>
    );
}

const useAnimatedLatestValueRef = (animatedValue: Animated.Value, initial?: number) => {
    //If we're given an initial value then we can pretend we've received a value from the listener already
    const [latestValue, setLatestValue] = useState(initial ?? 0)
    const latestValueRef = useRef(initial ?? 0)
    const initialized = useRef(typeof initial == "number")

    useEffect(() => {
        const id = animatedValue.addListener((v) => {
            //Store the latest animated value
            latestValueRef.current = v.value
            setLatestValue(v.value);
            //Indicate that we've recieved a value
            initialized.current = true
        })

        //Return a deregister function to clean up
        return () => animatedValue.removeListener(id)

        //Note that the behavior here isn't 100% correct if the animatedValue changes -- the returned ref
        //may refer to the previous animatedValue's latest value until the new listener returns a value
    }, [animatedValue])

    return {latestValueRef, initialized} as const
}

function AnimDisplay({value, style, formatter} : {value: Animated.Value, style: any, formatter: any}) {
    const value2 = useAnimatedLatestValueRef(value);
    const fixedValue = value2.latestValueRef.current;
    return <MyText style={style}>#{formatter(fixedValue)}</MyText>;
}

let CIRCLE_RADIUS = 36;
let Window = Dimensions.get('window');
const padding = 8;

const getStyles = (theme: ITheme) => {
    return StyleSheet.create({
        mainContainer: {
            flex: 1,
        },
        textContainer: {
            position: 'absolute',
            padding: 5,
            borderRadius: 5,
            top: 25,
            right: 85,
            width: 150,
        },
        textContainer2: {
            backgroundColor: theme.skeletonColor,
            position: 'absolute',
            padding: 5,
            borderRadius: 5,
            right: 0,
        },
        text: {
            // color: 'white',
            color: theme.textNoteColor,
        },
        arrows: {
            color: theme.textNoteColor,
            paddingHorizontal: 7,
            paddingVertical: 14,
        },
        draggableContainer: {
            // backgroundColor: 'yellow',
            position: 'absolute',
            // top: Window.height / 2 - CIRCLE_RADIUS,
            top: 0,//Window.height / 2 - CIRCLE_RADIUS,
            right: 0,
            bottom: 0,
        },
        circle: {
            padding: 8,
            backgroundColor: theme.skeletonColor,
            // backgroundColor: '#1abc9c',
            width: CIRCLE_RADIUS * 2,
            height: CIRCLE_RADIUS * 2,
            borderRadius: CIRCLE_RADIUS,
        },
        indicator: {
            backgroundColor: 'yellow',
            width: 30,
            height: 80,
            position: 'absolute',
            right: 0,
            top: 0,
        },
        list: {
            paddingHorizontal: 15,
            paddingVertical: 20,
        },
        container2: {
            flex: 1,
            // backgroundColor: '#B89579',
        },
        content: {
            flex: 1,
        },

        pickerRow: {
            // backgroundColor: 'yellow',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingRight: 20,
        },

        menu: {
            // backgroundColor: 'red',
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
            marginRight: 10,
        },
        menuButton: {
            // backgroundColor: 'blue',
            width: 40,
            justifyContent: 'center',
            alignItems: 'center',
            margin: 0,
            marginHorizontal: 2,
        },
        menuIcon: {
            color: theme.textColor,
        },

        measureContainer: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'visible',
            // backgroundColor: 'yellow',
            padding: 5,
            width: '100%',
        },
        activityInfo: {
            flex: 1,
            alignItems: 'flex-end'
        },
        pageInfo: {
            flex: 0,
            textAlign: 'right',
            marginLeft: 15,
        },
        arrowIcon: {
            marginLeft: 25,
            // backgroundColor: 'red',
        },
        name: {
            flex: 1,
        },
        nameMe: {
            flex: 1,
            fontWeight: 'bold',
        },
        cellRankMe: {
            padding: padding,
            textAlign: 'left',
            minWidth: 60,
            // width: 60,
            fontWeight: 'bold',
        },
        cellRank: {
            padding: padding,
            textAlign: 'left',
            width: 60,
        },
        cellRating: {
            padding: padding,
            width: 55,
        },
        cellRatingMe: {
            padding: padding,
            width: 55,
            fontWeight: 'bold',
        },
        flexRow: {
            flexDirection: 'row',
        },
        cellName: {
            // backgroundColor: 'yellow',
            padding: padding,
            flex: 4,
            flexDirection: 'row',
            alignItems: 'center',
        },
        cellName2: {
            padding: padding,
            flex: 4,
        },
        cellGames: {
            padding: padding,
            width: 90,
            textAlign: 'right',
            fontSize: 12,
            color: theme.textNoteColor,
        },
        cellWins: {
            padding: padding,
            flex: 1,
        },
        footerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            // marginBottom: 3,
            // padding: 3,
            // paddingVertical: 5,
            paddingHorizontal: 5,
            borderRadius: 5,
            marginRight: 30,
            marginLeft: 30,
            width: '100%',
            // backgroundColor: 'blue',
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 3,
            padding: 3,
            borderRadius: 5,
            marginRight: 30,
            marginLeft: 30,
            width: '100%',
            borderBottomWidth: 1,
            borderBottomColor: theme.borderColor,
        },
        row: {
            // marginRight: 30,
            // marginLeft: 30,
            // width: '100%',
            // flex: 3,
            height: 40,
            flex: 1,
        },
        innerRow: {
            // backgroundColor: 'red',
            flex: 1,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 5,
            paddingVertical: 12,
        },
        innerRowWithBorder: {
            // backgroundColor: 'green',
            flex: 1,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 5,
            paddingVertical: 5,
            borderBottomWidth: 1,
            borderBottomColor: theme.lightBorderColor,
        },
        countryIcon: {
            width: 21,
            height: 15,
            // paddingBottom: 4,
            marginRight: 5,
        },
        title: {
            marginBottom: 10,
            fontSize: 16,
            fontWeight: 'bold',
        },
        container: {
            display: 'flex',
            flex: 1,
            // backgroundColor: 'red',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 5,
        },
        centered: {
            // backgroundColor: 'yellow',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },

        info: {
            textAlign: 'center',
            marginBottom: 15,
            color: theme.textNoteColor,
            fontSize: 12,
        },
    });
};

const variants = makeVariants(getStyles);


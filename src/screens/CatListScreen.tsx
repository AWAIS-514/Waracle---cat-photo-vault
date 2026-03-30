import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  favouriteCat,
  getFavourites,
  getImageById,
  getVotes,
  unfavouriteCat,
  voteCat,
} from '../api';
import { CAT_API_KEY } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { getUploadedCatIds } from '../storage';
import { toReadableError } from '../utils/toReadableError';
import { CatCardData, Vote } from '../types';

function countVotes(votes: Vote[]) {
  const map = new Map<string, { up: number; down: number }>();

  votes.forEach(v => {
    const current = map.get(v.image_id) ?? { up: 0, down: 0 };
    if (v.value === 1) {
      current.up += 1;
    } else {
      current.down += 1;
    }
    map.set(v.image_id, current);
  });

  return map;
}

export default function CatListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const isMissingApiKey =
    !CAT_API_KEY || CAT_API_KEY.includes('REPLACE_WITH_YOUR_CAT_API_KEY');
  const [cats, setCats] = useState<CatCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const numCols = useMemo(() => {
    if (width >= 1200) return 4;
    if (width >= 900) return 3;
    if (width >= 600) return 2;
    return 1;
  }, [width]);

  const cardWidth = useMemo(() => {
    const gap = 12;
    const sidePadding = 24;
    return (width - sidePadding - gap * (numCols - 1)) / numCols;
  }, [numCols, width]);

  const loadCats = useCallback(async () => {
    try {
      setErrorMsg('');
      const uploadedIds = await getUploadedCatIds();
      if (!uploadedIds.length) {
        setCats([]);
        return;
      }

      const [images, favourites, votes] = await Promise.all([
        Promise.all(uploadedIds.map(id => getImageById(id))),
        getFavourites(),
        getVotes(),
      ]);

      const favMap = new Map(favourites.map(f => [f.image_id, f.id]));
      const voteMap = countVotes(votes);

      const merged = images.map(img => {
        const vote = voteMap.get(img.id) ?? { up: 0, down: 0 };
        return {
          image: img,
          favouriteId: favMap.get(img.id) ?? null,
          upVotes: vote.up,
          downVotes: vote.down,
          score: vote.up - vote.down,
        };
      });

      setCats(merged);
    } catch (err) {
      setErrorMsg(toReadableError(err));
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadCats();
    setRefreshing(false);
  }, [loadCats]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        await loadCats();
        if (mounted) {
          setLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [loadCats]),
  );

  const onToggleFavourite = async (cat: CatCardData) => {
    try {
      setActionBusyId(cat.image.id);
      if (cat.favouriteId) {
        await unfavouriteCat(cat.favouriteId);
      } else {
        await favouriteCat(cat.image.id);
      }
      await loadCats();
    } catch (err) {
      Alert.alert('Could not update favourite', toReadableError(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const onVote = async (cat: CatCardData, value: 0 | 1) => {
    try {
      setActionBusyId(cat.image.id);
      await voteCat(cat.image.id, value);
      await loadCats();
    } catch (err) {
      Alert.alert('Could not save vote', toReadableError(err));
    } finally {
      setActionBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#232b2b" />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {isMissingApiKey ? (
        <Text style={styles.warning}>
          Add your API key in src/config.ts before using the app.
        </Text>
      ) : null}

      <View style={styles.topRow}>
        <Text style={styles.title}>Your Cats</Text>
        <Pressable style={styles.uploadBtn} onPress={() => nav.navigate('Upload')}>
          <Text style={styles.uploadBtnText}>Upload Cat</Text>
        </Pressable>
      </View>

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {!cats.length ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No uploads yet</Text>
          <Text style={styles.emptyText}>
            Tap "Upload Cat" to add your first one.
          </Text>
        </View>
      ) : (
        <FlatList
          data={cats}
          key={numCols}
          numColumns={numCols}
          keyExtractor={item => item.image.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numCols > 1 ? styles.row : undefined}
          renderItem={({ item }) => {
            const busy = actionBusyId === item.image.id;
            return (
              <View style={[styles.card, { width: cardWidth }]}>
                <Image
                  source={{ uri: item.image.url }}
                  style={styles.catImage}
                  resizeMode="cover"
                />
                <Text style={styles.score}>Score: {item.score}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.smallBtn]}
                    onPress={() => onVote(item, 1)}
                    disabled={busy}>
                    <Text style={styles.smallBtnText}>Vote Up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallBtn]}
                    onPress={() => onVote(item, 0)}
                    disabled={busy}>
                    <Text style={styles.smallBtnText}>Vote Down</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[
                    styles.favBtn,
                    item.favouriteId ? styles.unfav : styles.fav
                  ]}
                  onPress={() => onToggleFavourite(item)}
                  disabled={busy}>
                  <Text style={styles.favBtnText}>
                    {item.favouriteId ? 'Unfavourite' : 'Favourite'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f7f8',
    paddingHorizontal: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    marginTop: 10,
    backgroundColor: '#fff7d6',
    borderColor: '#e9d27f',
    borderWidth: 1,
    color: '#725a00',
    borderRadius: 10,
    padding: 10,
  },
  topRow: {
    marginTop: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#101518',
  },
  uploadBtn: {
    backgroundColor: '#0d6efd',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#b42318',
    marginBottom: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#161b1f',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#5c6670',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 28,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5eaee',
    padding: 10,
    marginBottom: 12,
  },
  catImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#d9dee3',
  },
  score: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: '700',
    color: '#24303b',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: '#edf2f7',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  smallBtnText: {
    color: '#1f2a35',
    fontWeight: '600',
    fontSize: 13,
  },
  favBtn: {
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  fav: {
    backgroundColor: '#ffdeeb',
  },
  unfav: {
    backgroundColor: '#f4f4f5',
  },
  favBtnText: {
    color: '#24303b',
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.55,
  },
});

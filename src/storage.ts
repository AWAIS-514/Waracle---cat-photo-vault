import AsyncStorage from '@react-native-async-storage/async-storage';

const UPLOADED_IDS_KEY = 'uploaded_cat_image_ids';

export async function getUploadedCatIds() {
  const storedIds = await AsyncStorage.getItem(UPLOADED_IDS_KEY);
  if (!storedIds) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(storedIds);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // If storage gets corrupted, recover gracefully.
    return [];
  }
}

export async function saveUploadedCatIds(ids: string[]) {
  await AsyncStorage.setItem(UPLOADED_IDS_KEY, JSON.stringify(ids));
}

export async function addUploadedCatId(id: string) {
  const existingIds = await getUploadedCatIds();
  if (existingIds.includes(id)) {
    return existingIds;
  }

  const nextIds = [id, ...existingIds];
  await saveUploadedCatIds(nextIds);
  return nextIds;
}

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';

import { uploadCatImage } from '../api';
import type { RootStackParamList } from '../navigation/types';
import { addUploadedCatId } from '../storage';
import { toReadableError } from '../utils/toReadableError';

type PickedFile = {
  uri: string;
  type: string;
  name: string;
  size?: number | null;
};

export default function UploadScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState(false);

  const canSubmit = !!file && !uploading;

  const onPickFile = async () => {
    try {
      setErrorMsg('');
      const res: any = await new Promise(resolve => {
        launchImageLibrary(
          {
            mediaType: 'photo',
            selectionLimit: 1,
          },
          resolve,
        );
      });

      if (res?.didCancel) {
        return;
      }

      if (res?.errorCode) {
        setErrorMsg(res.errorMessage ?? 'Could not pick image.');
        return;
      }

      const asset = res?.assets?.[0];
      if (!asset?.uri) {
        setErrorMsg('Could not read selected image.');
        return;
      }

      setFile({
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        name: asset.fileName ?? `cat-${Date.now()}.jpg`,
        size: asset.fileSize,
      });
    } catch (err: any) {
      console.error('[upload] pick image failed', err);
      setErrorMsg(toReadableError(err));
    }
  };

  const onUpload = async () => {
    if (!file) {
      setErrorMsg('Please pick an image first.');
      return;
    }

    if (file.size && file.size > 20 * 1024 * 1024) {
      setErrorMsg('Image is too large. Max allowed size is 20MB.');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg('');
      const uploaded = await uploadCatImage(file);
      await addUploadedCatId(uploaded.id);
      nav.navigate('Home');
    } catch (err: any) {
      console.error('[upload] uploadCatImage failed', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
      });
      setErrorMsg(toReadableError(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.page}>
      <Text style={styles.title}>Upload a Cat</Text>
      <Text style={styles.subtitle}>
        Pick any image file and send it to TheCatAPI.
      </Text>

      <Pressable style={styles.pickBtn} onPress={onPickFile} disabled={uploading}>
        <Text style={styles.pickBtnText}>
          {file ? 'Pick Another Image' : 'Choose Image'}
        </Text>
      </Pressable>

      {file ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" />
          <Text style={styles.fileText} numberOfLines={1}>
            {file.name}
          </Text>
        </View>
      ) : null}

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <Pressable
        style={[styles.uploadBtn, !canSubmit && styles.disabled]}
        onPress={onUpload}
        disabled={!canSubmit}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadBtnText}>Upload</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.cancelBtn}
        onPress={() => nav.goBack()}
        disabled={uploading}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f7f8',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#101518',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    color: '#4f5963',
  },
  pickBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7dde3',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  pickBtnText: {
    fontWeight: '600',
    color: '#1f2a35',
  },
  previewWrap: {
    marginTop: 16,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#d9dee3',
  },
  fileText: {
    marginTop: 8,
    color: '#4f5963',
  },
  error: {
    marginTop: 12,
    color: '#b42318',
  },
  uploadBtn: {
    marginTop: 18,
    backgroundColor: '#0d6efd',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 14,
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#5c6670',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

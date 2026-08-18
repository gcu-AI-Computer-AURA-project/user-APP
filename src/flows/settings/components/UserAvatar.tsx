import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import type { AuraUser } from '../../../api/types';
import { styles } from '../../../styles/appStyles';

const getUserInitial = (user?: AuraUser | null) => {
  const name = user?.name?.trim();
  const email = user?.email?.trim();
  if (name) return name.slice(0, 1);
  if (email) return email.slice(0, 1).toUpperCase();
  return 'A';
};

export function UserAvatar({ user }: { user?: AuraUser | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const profileImageUrl = user?.profileImageUrl?.trim();

  useEffect(() => {
    setImageFailed(false);
  }, [profileImageUrl]);

  if (profileImageUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: profileImageUrl }}
        style={styles.avatarImage}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarText}>{getUserInitial(user)}</Text>
    </View>
  );
}

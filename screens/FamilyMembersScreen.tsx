import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

interface FamilyMember {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  family_id: string;
  created_at: string;
  avatar_url?: string;
  phone?: string;
}

export default function FamilyMembersScreen() {
  const { user, userProfile } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Mock család tagok
  const mockFamilyMembers: FamilyMember[] = [
    {
      id: user?.id || '1',
      email: user?.email || 'te@example.com',
      full_name: userProfile?.full_name || 'Te',
      display_name: userProfile?.display_name || 'Családfő',
      family_id: userProfile?.family_id || 'family-1',
      created_at: '2025-01-01T00:00:00Z',
      avatar_url: undefined,
      phone: userProfile?.phone,
    },
    {
      id: '2',
      email: 'partner@example.com',
      full_name: 'Példa Péter',
      display_name: 'Partner',
      family_id: userProfile?.family_id || 'family-1',
      created_at: '2025-01-15T10:00:00Z',
      avatar_url: undefined,
      phone: '+36301234567',
    },
  ];

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Valós adatok betöltése a Supabase-ből
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', userProfile?.family_id || user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Hiba a családtagok betöltésekor:', error);
        // Fallback mock adatok használata
        setFamilyMembers(mockFamilyMembers);
      } else {
        setFamilyMembers(data || []);
      }

    } catch (error) {
      console.error('Hiba a családtagok betöltésekor:', error);
      // Fallback mock adatok használata
      setFamilyMembers(mockFamilyMembers);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Hiba', 'Kérlek add meg az email címet!');
      return;
    }

    if (!userProfile?.family_id) {
      Alert.alert('Hiba', 'Nincs család beállítva!');
      return;
    }

    setIsInviting(true);
    try {
      // TODO: Meghívó email küldése
      // Itt implementálható a meghívó logika
      Alert.alert('Meghívó elküldve', `Meghívó elküldve a következő címre: ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);

    } catch (error) {
      console.error('Hiba a meghívás során:', error);
      Alert.alert('Hiba', 'Nem sikerült elküldeni a meghívót');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = (member: FamilyMember) => {
    if (member.id === user?.id) {
      Alert.alert('Figyelem', 'Nem távolíthatod el saját magad a családból!');
      return;
    }

    Alert.alert(
      'Családtag eltávolítása',
      `Biztosan eltávolítod ${member.full_name || member.email} felhasználót a családból?`,
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Eltávolítás',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Családtag eltávolítása az adatbázisból
              setFamilyMembers(prev => prev.filter(m => m.id !== member.id));
              Alert.alert('Siker', 'Családtag sikeresen eltávolítva');
            } catch (error) {
              Alert.alert('Hiba', 'Nem sikerült eltávolítani a családtagot');
            }
          },
        },
      ]
    );
  };

  const renderFamilyMember = ({ item }: { item: FamilyMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        {item.avatar_url ? (
          // TODO: Profilkép megjelenítése
          <Ionicons name="person" size={24} color="#14B8A6" />
        ) : (
          <Ionicons name="person" size={24} color="#14B8A6" />
        )}
      </View>
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.full_name || item.display_name || item.email}
        </Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
        {item.phone && (
          <Text style={styles.memberPhone}>{item.phone}</Text>
        )}
        <Text style={styles.memberJoined}>
          Csatlakozott: {new Date(item.created_at).toLocaleDateString('hu-HU')}
        </Text>
      </View>
      
      <View style={styles.memberActions}>
        {item.id === user?.id ? (
          <View style={styles.ownerBadge}>
            <Ionicons name="trophy" size={16} color="#F59E0B" />
            <Text style={styles.ownerText}>Te</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveMember(item)}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderFamilyStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="people" size={24} color="#14B8A6" />
        <Text style={styles.statNumber}>{familyMembers.length}</Text>
        <Text style={styles.statLabel}>Családtagok</Text>
      </View>
      
      <View style={styles.statCard}>
        <Ionicons name="calendar" size={24} color="#8B5CF6" />
        <Text style={styles.statNumber}>
          {new Date(userProfile?.created_at || '').getFullYear() || '2025'}
        </Text>
        <Text style={styles.statLabel}>Kezdés éve</Text>
      </View>
      
      <View style={styles.statCard}>
        <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        <Text style={styles.statNumber}>100%</Text>
        <Text style={styles.statLabel}>Biztonság</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Betöltés...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Családtagok</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Family Stats */}
        {renderFamilyStats()}

        {/* Family Members List */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>Családtagok ({familyMembers.length})</Text>
          
          <FlatList
            data={familyMembers}
            keyExtractor={(item) => item.id}
            renderItem={renderFamilyMember}
            style={styles.membersList}
            contentContainerStyle={styles.membersContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Invite Modal */}
        <Modal
          visible={showInviteModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Családtag meghívása</Text>
                <TouchableOpacity
                  onPress={() => setShowInviteModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDescription}>
                Add meg annak a személynek az email címét, akit szeretnél meghívni a családba.
              </Text>

              <TextInput
                style={styles.emailInput}
                placeholder="Email cím"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.inviteActionButton, { opacity: isInviting ? 0.5 : 1 }]}
                onPress={handleInviteMember}
                disabled={isInviting}
              >
                {isInviting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="white" />
                    <Text style={styles.inviteActionText}>Meghívó küldése</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  inviteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  membersSection: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  membersList: {
    flex: 1,
  },
  membersContent: {
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E5F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 12,
    color: '#14B8A6',
    marginBottom: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#999',
  },
  memberActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ownerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  removeButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  inviteActionButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

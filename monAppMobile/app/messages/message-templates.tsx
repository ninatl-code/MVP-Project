import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabaseClient';

const COLORS = {
  primary: '#007AFF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  border: '#D1D1D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
};

interface MessageTemplate {
  id: string;
  provider_id: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const TEMPLATE_CATEGORIES = [
  { id: 'greeting', label: 'Greeting', icon: 'hand-left-outline' },
  { id: 'booking_confirmation', label: 'Booking Confirmation', icon: 'checkmark-circle-outline' },
  { id: 'reminder', label: 'Reminder', icon: 'alarm-outline' },
  { id: 'follow_up', label: 'Follow Up', icon: 'chatbubbles-outline' },
  { id: 'cancellation', label: 'Cancellation', icon: 'close-circle-outline' },
  { id: 'thank_you', label: 'Thank You', icon: 'heart-outline' },
  { id: 'custom', label: 'Custom', icon: 'create-outline' },
];

export default function MessageTemplatesScreen() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('greeting');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }
      setProviderId(user.id);

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.content.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('greeting');
    setModalVisible(true);
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormCategory(template.category);
    setModalVisible(true);
  };

  const saveTemplate = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    if (!providerId) return;

    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update({
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        Alert.alert('Success', 'Template updated successfully');
      } else {
        // Create new template
        const { error } = await supabase.from('message_templates').insert({
          provider_id: providerId,
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          is_active: true,
        });

        if (error) throw error;
        Alert.alert('Success', 'Template created successfully');
      }

      setModalVisible(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const toggleTemplateStatus = async (template: MessageTemplate) => {
    try {
      const { error } = await supabase
        .from('message_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);

      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template status:', error);
      Alert.alert('Error', 'Failed to update template');
    }
  };

  const deleteTemplate = async (template: MessageTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('message_templates')
                .delete()
                .eq('id', template.id);

              if (error) throw error;
              loadTemplates();
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find((c) => c.id === category);
    return cat?.icon || 'document-text-outline';
  };

  const getCategoryLabel = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find((c) => c.id === category);
    return cat?.label || category;
  };

  const renderTemplateCard = (template: MessageTemplate) => (
    <View key={template.id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateIcon}>
          <Ionicons name={getCategoryIcon(template.category) as any} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.templateInfo}>
          <Text style={styles.templateTitle}>{template.title}</Text>
          <Text style={styles.templateCategory}>{getCategoryLabel(template.category)}</Text>
        </View>
        <View style={styles.templateActions}>
          <TouchableOpacity onPress={() => toggleTemplateStatus(template)}>
            <Ionicons
              name={template.is_active ? 'toggle' : 'toggle-outline'}
              size={32}
              color={template.is_active ? COLORS.success : COLORS.border}
            />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.templateContent} numberOfLines={3}>
        {template.content}
      </Text>
      <View style={styles.templateFooter}>
        <TouchableOpacity
          style={styles.templateButton}
          onPress={() => openEditModal(template)}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={styles.templateButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.templateButton, styles.deleteButton]}
          onPress={() => deleteTemplate(template)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          <Text style={[styles.templateButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Templates</Text>
        <TouchableOpacity onPress={openCreateModal}>
          <Ionicons name="add" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb-outline" size={24} color={COLORS.warning} />
          <Text style={styles.infoText}>
            Create reusable message templates to save time and ensure consistent communication
            with your clients.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'all' && styles.categoryChipTextActive,
              ]}
            >
              All ({templates.length})
            </Text>
          </TouchableOpacity>
          {TEMPLATE_CATEGORIES.map((category) => {
            const count = templates.filter((t) => t.category === category.id).length;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.categoryChipTextActive,
                  ]}
                >
                  {category.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Templates List */}
        <View style={styles.templatesSection}>
          {filteredTemplates.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
              <Text style={styles.emptyStateTitle}>No Templates Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first message template to get started'}
              </Text>
              <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateModal}>
                <Text style={styles.emptyStateButtonText}>Create Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredTemplates.map(renderTemplateCard)
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </Text>
            <TouchableOpacity onPress={saveTemplate}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Template Title</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Welcome Message"
                placeholderTextColor={COLORS.textSecondary}
                value={formTitle}
                onChangeText={setFormTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelector}
              >
                {TEMPLATE_CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categorySelectorButton,
                      formCategory === category.id && styles.categorySelectorButtonActive,
                    ]}
                    onPress={() => setFormCategory(category.id)}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={20}
                      color={formCategory === category.id ? COLORS.surface : COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.categorySelectorText,
                        formCategory === category.id && styles.categorySelectorTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message Content</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Type your message template here..."
                placeholderTextColor={COLORS.textSecondary}
                value={formContent}
                onChangeText={setFormContent}
                multiline
                numberOfLines={8}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {formContent.length}/500 characters
              </Text>
            </View>

            <View style={styles.formTip}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.formTipText}>
                Tip: Use variables like {'{client_name}'} or {'{booking_date}'} for personalized
                messages.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.warning}15`,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 8,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  templatesSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  templateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  templateActions: {
    marginLeft: 12,
  },
  templateContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}15`,
  },
  deleteButton: {
    backgroundColor: `${COLORS.error}15`,
  },
  templateButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  deleteButtonText: {
    color: COLORS.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.surface,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  categorySelector: {
    marginTop: 8,
  },
  categorySelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categorySelectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categorySelectorText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 6,
  },
  categorySelectorTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  formTip: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.primary}15`,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  formTipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 8,
    lineHeight: 18,
  },
});

/**
 * ConversationScreen — messagerie temps réel entre client et agent sur une mission.
 */
import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { conversationsApi } from '@api/endpoints/conversations';
import { useApi }           from '@hooks/useApi';
import { useAuthStore }     from '@store/authStore';
import { Avatar }           from '@components/ui/Avatar';
import { LoadingState }     from '@components/ui/LoadingState';
import { ScreenHeader }     from '@components/ui/ScreenHeader';
import { colors }           from '@theme/colors';
import { spacing, radius, layout } from '@theme/spacing';
import { fontSize, fontFamily }    from '@theme/typography';
import type { Message, MissionStackParamList } from '@models/index';

type Props = NativeStackScreenProps<MissionStackParamList, 'Conversation'>;

export const ConversationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { missionId }                             = route.params;
  const { user }                                  = useAuthStore();
  const { data: conversation, loading, execute }  = useApi(conversationsApi.getByMission);
  const [text, setText]                           = useState('');
  const [sending, setSending]                     = useState(false);
  const listRef                                   = useRef<FlatList>(null);

  const load = useCallback(async () => {
    await execute(missionId);
    await conversationsApi.markRead(missionId).catch(() => {});
  }, [execute, missionId]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if ((conversation?.messages?.length ?? 0) > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversation?.messages?.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText('');
    setSending(true);
    try {
      await conversationsApi.sendMessage(missionId, { content });
      await load();
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const messages = conversation?.messages ?? [];

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const sender = item.sender;

    return (
      <View style={[msgStyles.row, isMe && msgStyles.rowMe]}>
        {!isMe && (
          <Avatar
            fullName={sender?.fullName ?? '?'}
            avatarUrl={sender?.avatarUrl}
            size="xs"
          />
        )}
        <View style={[msgStyles.bubble, isMe ? msgStyles.bubbleMe : msgStyles.bubbleThem]}>
          {!isMe && sender && (
            <Text style={msgStyles.senderName}>{sender.fullName}</Text>
          )}
          <Text style={[msgStyles.content, isMe && msgStyles.contentMe]}>
            {item.content}
          </Text>
          <Text style={[msgStyles.time, isMe && msgStyles.timeMe]}>
            {new Date(item.createdAt).toLocaleTimeString('fr-FR', {
              hour:   '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isMe && user && (
          <Avatar fullName={user.fullName} avatarUrl={user.avatarUrl} size="xs" />
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScreenHeader
        title="Messagerie"
        subtitle={`Mission #${missionId.slice(-6).toUpperCase()}`}
        onBack={() => navigation.goBack()}
      />

      {loading && !conversation ? (
        <LoadingState message="Chargement des messages…" />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>
                Démarrez la conversation avec votre agent.
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Votre message…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>{sending ? '⏳' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const msgStyles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            spacing[2],
    marginBottom:   spacing[3],
  },
  rowMe: { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth:    '75%',
    borderRadius: radius.xl,
    padding:     spacing[3] + 2,
    gap:         4,
  },
  bubbleThem: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth:  1,
    borderColor:  colors.border,
  },
  bubbleMe: {
    backgroundColor:    colors.primary,
    borderBottomRightRadius: 4,
  },
  senderName: {
    fontFamily: fontFamily.bodyMedium,
    fontSize:   fontSize.xs,
    color:      colors.primary,
    marginBottom: 2,
  },
  content: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.base,
    color:      colors.textPrimary,
    lineHeight: fontSize.base * 1.45,
  },
  contentMe: { color: colors.textInverse },
  time: {
    fontFamily: fontFamily.body,
    fontSize:   9,
    color:      colors.textMuted,
    alignSelf:  'flex-end',
  },
  timeMe: { color: 'rgba(10,12,15,0.5)' },
});

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  messageList: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[4],
    flexGrow:          1,
  },
  emptyWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap:            spacing[3],
  },
  emptyIcon: { fontSize: 44 },
  emptyText: {
    fontFamily: fontFamily.body,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
    textAlign:  'center',
  },
  inputBar: {
    flexDirection:   'row',
    alignItems:      'flex-end',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical:   spacing[3],
    backgroundColor: colors.backgroundElevated,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    gap:             spacing[3],
  },
  input: {
    flex:            1,
    maxHeight:       120,
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontFamily:      fontFamily.body,
    fontSize:        fontSize.base,
    color:           colors.textPrimary,
  },
  sendBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon: {
    fontSize: 18,
    color:    colors.textInverse,
    marginLeft: 2,
  },
});

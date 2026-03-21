import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText as Text } from '../ui/AppText';
import { colors } from '../../theme/colors';

interface Step {
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <View style={styles.stepCol}>
              <View
                style={[
                  styles.circle,
                  (isCompleted || isActive) ? styles.circleFilled : styles.circleEmpty,
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      isActive ? styles.stepNumberActive : styles.stepNumberInactive,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive ? styles.labelActive : isCompleted ? styles.labelCompleted : styles.labelInactive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.line,
                  index < currentStep ? styles.lineActive : styles.lineInactive,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
  },
  stepCol: {
    alignItems: 'center',
    width: 60,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  circleFilled: {
    backgroundColor: colors.accent,
  },
  circleEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.grayLight,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepNumberInactive: {
    color: colors.gray,
  },
  label: {
    fontSize: 10,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: 'Outfit-SemiBold',
    color: colors.accent,
  },
  labelCompleted: {
    fontFamily: 'Outfit-Medium',
    color: colors.accent,
  },
  labelInactive: {
    fontFamily: 'Outfit-Regular',
    color: colors.gray,
  },
  line: {
    flex: 1,
    height: 1.5,
    marginTop: 13,
  },
  lineActive: {
    backgroundColor: colors.accent,
  },
  lineInactive: {
    backgroundColor: colors.grayLight,
  },
});

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors matching the web UI exactly
  static const Color bgPrimary = Color(0xFF0A0A0F);
  static const Color bgSecondary = Color(0xFF12121A);
  static const Color bgTertiary = Color(0xFF1A1A2E);
  static const Color bgElevated = Color(0xFF22223A);
  static const Color bgHover = Color(0xFF2A2A44);

  static const Color surfaceGlass = Color(0xB312121A);

  static const Color accentPrimary = Color(0xFF6C5CE7);
  static const Color accentPrimaryLight = Color(0xFFA78BFA);
  static const Color accentSecondary = Color(0xFF00D2FF);
  static const Color accentGlow = Color(0x4D6C5CE7);

  static const Color textPrimary = Color(0xFFE4E4E7);
  static const Color textSecondary = Color(0xFF71717A);
  static const Color textMuted = Color(0xFF52525B);
  static const Color textAccent = Color(0xFFA78BFA);

  static const Color borderDefault = Color(0x0FFFFFFF);
  static const Color borderHover = Color(0x1FFFFFFF);
  static const Color borderActive = Color(0x666C5CE7);

  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);

  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: bgPrimary,
      colorScheme: ColorScheme.dark(
        primary: accentPrimary,
        secondary: accentSecondary,
        surface: bgSecondary,
        onSurface: textPrimary,
        error: danger,
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).copyWith(
        bodyMedium: GoogleFonts.inter(
          color: textPrimary,
          fontSize: 14,
        ),
        bodySmall: GoogleFonts.inter(
          color: textSecondary,
          fontSize: 12,
        ),
      ),
      dividerColor: borderDefault,
      drawerTheme: const DrawerThemeData(
        backgroundColor: bgSecondary,
        scrimColor: Color(0x99000000),
      ),
    );
  }

  // Gradient for logo and accent elements
  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentPrimary, accentSecondary],
  );

  static const LinearGradient textGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentPrimary, accentSecondary],
  );
}

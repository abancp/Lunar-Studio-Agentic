import 'package:flutter_test/flutter_test.dart';
import 'package:lunar_studio_app/main.dart';

void main() {
  testWidgets('App renders smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const LunarStudioApp());
    expect(find.byType(LunarStudioApp), findsOneWidget);
  });
}

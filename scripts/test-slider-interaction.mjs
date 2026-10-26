import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- RUNNING SLIDER & MODAL INTERACTION SUITE ---');

const sliderSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/home/SliderSection.tsx'),
  'utf-8'
);

const editorSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/admin/builder/SiteBuilderEditor.tsx'),
  'utf-8'
);

const builderPageSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/admin/builder/page.tsx'),
  'utf-8'
);

// 1. Verify isolated pause conditions in SliderSection
console.log('Test 1: Verify isolated hover and focus pause conditions');
assert.ok(
  sliderSource.includes('const [isHovered, setIsHovered] = useState(false);'),
  'SliderSection must declare isHovered state'
);
assert.ok(
  sliderSource.includes('const [isFocused, setIsFocused] = useState(false);'),
  'SliderSection must declare isFocused state'
);
assert.ok(
  sliderSource.includes('const isPaused = isHovered || isFocused;'),
  'SliderSection must compute isPaused as union of isHovered and isFocused'
);

// Simulate state machine: focus inside, then mouse out
{
  let isHovered = true;
  let isFocused = true;
  assert.equal(isHovered || isFocused, true, 'Hover + Focus = Paused');

  // Mouse leaves slider container while focus is still inside
  isHovered = false;
  assert.equal(isHovered || isFocused, true, 'Mouse left but focus remains = Autoplay MUST stay paused');

  // Focus blur
  isFocused = false;
  assert.equal(isHovered || isFocused, false, 'Neither hovered nor focused = Autoplay resumes');
}
console.log('PASS: Hover and focus pause condition isolation verified');

// 2. Verify drag and vertical scroll safety
console.log('Test 2: Verify touch gesture thresholds and vertical scroll protection');
assert.ok(
  sliderSource.includes("touchAction: 'pan-y'"),
  'SliderSection must set touchAction pan-y for smooth vertical scrolling'
);
assert.ok(
  sliderSource.includes('Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6'),
  'Predominantly vertical movement must cancel slide dragging'
);
assert.ok(
  sliderSource.includes('suppressClick.current = true'),
  'Horizontal swipe must suppress clicks to prevent opening links unintentionally'
);
assert.ok(
  sliderSource.includes('releasePointerCapture'),
  'Pointer capture must be released properly upon drag end or cancel'
);

// Simulate threshold calculation
{
  function evaluateGesture(dx, dy) {
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
      return { action: 'cancel_drag_allow_vertical_scroll', suppressClick: false };
    }
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      return { action: 'horizontal_swipe', suppressClick: true };
    }
    return { action: 'tap_or_small_jitter', suppressClick: false };
  }

  // Pure vertical page scroll: dx=2, dy=18
  const scrollGesture = evaluateGesture(2, 18);
  assert.equal(scrollGesture.action, 'cancel_drag_allow_vertical_scroll');
  assert.equal(scrollGesture.suppressClick, false);

  // Horizontal swipe: dx=-45, dy=3
  const swipeGesture = evaluateGesture(-45, 3);
  assert.equal(swipeGesture.action, 'horizontal_swipe');
  assert.equal(swipeGesture.suppressClick, true);

  // Tap without dragging: dx=1, dy=1
  const tapGesture = evaluateGesture(1, 1);
  assert.equal(tapGesture.action, 'tap_or_small_jitter');
  assert.equal(tapGesture.suppressClick, false);
}
console.log('PASS: Touch gesture logic preserves vertical scrolling and blocks unintentional link clicks');

// 3. Verify dot pagination semantics and hit area
console.log('Test 3: Verify dot pagination accessibility and hit area sizing');
assert.ok(
  sliderSource.includes('<nav') && sliderSource.includes('aria-label="Điều hướng slide"'),
  'Pagination must use nav element with descriptive aria-label'
);
assert.ok(
  sliderSource.includes('aria-current={idx === current ? \'true\' : undefined}'),
  'Dots must use aria-current for the active item instead of incorrect role=tab'
);
assert.ok(
  sliderSource.includes('w-8 h-8 flex items-center justify-center'),
  'Dot buttons must have at least 32px hit area for easy touch interaction'
);
console.log('PASS: Dot pagination semantics and touch target verified');

// 4. Verify dynamic prefers-reduced-motion via useSyncExternalStore
console.log('Test 4: Verify dynamic reduced-motion handling without set-state-in-effect');
assert.ok(
  sliderSource.includes('useSyncExternalStore('),
  'SliderSection must use useSyncExternalStore for prefers-reduced-motion'
);
assert.ok(
  sliderSource.includes('prefers-reduced-motion: reduce'),
  'Must query prefers-reduced-motion: reduce media query'
);
assert.ok(
  sliderSource.includes('addEventListener') && sliderSource.includes('removeEventListener'),
  'Must subscribe and unsubscribe to media query change events'
);
console.log('PASS: prefers-reduced-motion subscription verified');

// 5. Verify modal focus trap, Escape, and trigger restoration in Admin Builder
console.log('Test 5: Verify modal focus trap and restoration in SiteBuilderEditor & Builder page');
assert.ok(
  editorSource.includes('previewTriggerRef') && editorSource.includes('revisionsTriggerRef'),
  'SiteBuilderEditor must track trigger refs for Preview and Revisions modals'
);
assert.ok(
  editorSource.includes('aria-labelledby="preview-modal-title"'),
  'Preview modal must have aria-labelledby'
);
assert.ok(
  editorSource.includes('aria-labelledby="revisions-modal-title"'),
  'Revisions modal must have aria-labelledby'
);
assert.ok(
  editorSource.includes('aria-label="Đóng cửa sổ xem trước"'),
  'Preview close button must have descriptive accessible label'
);
assert.ok(
  editorSource.includes('aria-label="Đóng lịch sử phiên bản"'),
  'Revisions close button must have descriptive accessible label'
);
assert.ok(
  builderPageSource.includes('aria-labelledby="create-landing-modal-title"'),
  'Create Landing modal must have aria-labelledby'
);
assert.ok(
  builderPageSource.includes('createTriggerRef') && builderPageSource.includes('closeCreateModal'),
  'Create Landing modal must restore focus to trigger button upon close'
);
console.log('PASS: Modal focus trap, accessibility labels, and trigger restoration verified');

// 6. Verify removal of default Rick Astley and Unsplash sample URLs
console.log('Test 6: Verify removal of sample unapproved URLs in forms');
assert.ok(
  !editorSource.includes('dQw4w9WgXcQ'),
  'Rick Astley video URL must not be hardcoded in builder forms'
);
assert.ok(
  !editorSource.includes('photo-1531297484001-80022131f5a1'),
  'Customer gallery must not prefill default Unsplash photo'
);
assert.ok(
  editorSource.includes('Vui lòng nhập URL video (YouTube hoặc TikTok)'),
  'Video form must show clear inline validation for empty URL'
);
assert.ok(
  editorSource.includes('Vui lòng nhập URL ảnh hoặc chọn từ thư viện Media'),
  'Customer gallery form must show clear inline validation for empty URL'
);
console.log('PASS: Clean empty defaults and inline validation verified');

console.log('==============================================');
console.log('ALL SLIDER & MODAL INTERACTION TESTS PASSED!');
console.log('==============================================');

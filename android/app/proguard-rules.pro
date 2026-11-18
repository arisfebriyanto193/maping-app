# ProGuard rules for DJI Waypoint Injector
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.json.* <fields>;
}

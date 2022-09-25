--- native/src/util/unix/realpath.c	2022-07-13 17:06:59.000000000 -0700
+++ wasm/src/util/unix/realpath.c	2022-09-24 18:17:12.770325010 -0700
@@ -17,7 +17,8 @@
 char *p_realpath(const char *pathname, char *resolved)
 {
 	char *ret;
-	if ((ret = realpath(pathname, resolved)) == NULL)
+  // zython - I don't know why this cast is needed since it's char* in the upstream header.
+	if ((ret = (char*) realpath(pathname, resolved)) == NULL)
 		return NULL;
 
 #ifdef __OpenBSD__

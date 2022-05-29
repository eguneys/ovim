export const tutor = `
==============================
= Welcome to OVim Tutorial   =
==============================

OVim is an online editor inspired by Vim, very powerful editor, with many commands.

This page captures your keyboard, including your shortcut keys, so make sure to disable any browser plugins that intercept your keyboard.

Assign "Caps-Lock" to "Ctrl", and "Tab" to "Escape" to use the commands easier.

Press j enough times to move the cursor so that lesson 1.1 completely fills the screen.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 1.1 MOVING THE CURSOR

** To move the cursor, press the h,j,k,l keys as indicated. **

       ^
       k
  < h     l >
       j
       v

 Hold down the j keys so it repeats. Move to lesson 1.3.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 1.3: TEXT EDITING - DELETION

 ** Press  x  to delete the character under the cursor. **

 1. Move the cursor to the line below marked  -->.

 2. To fix the errors, move the cursor on top of the character to delete.

 3. Press  x  to delete the character.

 4. Practice deleting extra characters, until sentence is correct.

--->  The ccow jumpedd ovverr thhe mooon.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 1.4: TEXT EDITING - INSERTION

    ** Press  i  to insert text. **

 1. Move the cursor to the line below marked -->.

 2. To make the first line the same as the second, move the cursor on top of the first character AFTER where the text is to be inserted.  
 
 3. Press  i  and type the necessary words.

 4. As each error is fixed press <ESC> to return to Normal mode.

--> There is text misng this.
--> There is some text missing from this line.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 1.5: TEXT EDITING - APPENDING

      **  Press  A  to append text. **

 1. Move the cursor to the first line below marked -->.
  It does not matter on what character the cursor is on that line.

 2. Press  A  and type necessary words.

 3. As the text is appended, press <ESC> to return back to Normal mode.

 4. Move the cursor to the second line marked --> and correct the sentence.

--> There is some text missing from th
    There is some text missing from this line.
--> There is also some text miss
    There is also some text missing here.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.1: DELETION COMMANDS

      **  Type  dw  to delete a word. **

 1. Press <ESC> to make sure you are in Normal mode.

 2. Move the cursor to the line below marked -->.

 3. Move the cursor to the beginning of a word that needs to be deleted.

 4. Type  dw  to make the word dissapear.

-->  There are a some words fun that don't belong paper in this sentence.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.2: MORE DELETION COMMANDS

      **  Type  d$  to delete to the end of the line. **

  1. Press <ESC> to make sure you are in Normal mode.

  2. Move the cursor to the line below marked -->.

  3. Move the cursor at the end of the correct line (After the first . ).

  4. Type  d$  to delete to the end of the line.

--> Somebody typed the end of this line twice. end of this line twice.

  5. Next Lesson 2.3, explains this in detail.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          Lesson 2.3: ON OPERATORS AND MOTIONS

Many commands that change text are made from an operator and a motion.
The format for a delete command with the  d  delete operator is like:

    d  motion

A short list of motions:

  w - until the start of next word, EXCLUDING its first character.
  e - to the end of the current word, INCLUDING the last character.
  $ - to the end of the line, INCLUDING the last character.


Thus typing  de  will delete from the cursor to the end of the word.

Pressing just the motion while in Normal mode without an operator will move the cursor as specified.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       Lesson 2.6: OPERATING ON LINES

  ** Type  dd  to delete a whole line. **

 1. Move the cursor to the second line in the phrase below.
 2. Type  dd  to delete the line.


--> 1) Roses are red,
--> 2) Mud is fun,
--> 3) Violets are blue.


~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 2.7: THE UNDO COMMAND

  ** Press  u  to undo the last commands.  **

 1. Move the cursor to the line below marked --> and place it on the first error.
 2. Type x to delete the first unwanted character.
 3. Now type  u  to unde the last command executed.
 4. This time fix all the errors.
 5. Now type  u  a few times to undo the fixes.


--> Fiix the errors oon thhis line and reeplace them witth undo.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 3.1: THE PUT COMMAND

  ** Type  p  to put previously deleted text after the cursor. **


 1. Move the cursor to the first line below marked --> .

 2. Type dd to delete the line and store it in a Vim register.

 3. Move the cursor to the c) line, ABOVE where the deleted line should go.

 4. Type  p  to put the line below the cursor.

 5. Put the lines all in correct order.

--> d) Can you learn too?
--> b) Violets are blue,
--> c) Intelligence is learned,
--> a) Roses are red,

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Lesson 3.2: THE REPLACE COMMAND

   ** Type  rx  to replace the character at the cursor with  x  . **

  1. Move the cursor to the first line below marked -->.

  2. Move the cursor on top of the first error.

  3. Type  r  and then the character which should be there.

  4. Fix all the errors.

--> Whan this lime was tuoed in, someone presswd some wrojg keys!
--> When this line was typed in, someone pressed some wrong keys!

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     Lesson 4.1: CURSOR LOCATION

   ** Type  G  to move to a line in the file. **

  NOTE: Read the entire lesson before executing any of the steps!

   1. Press  G  to move to the bottom of the file.
      Type  gg  to move to the start of the file.

 `

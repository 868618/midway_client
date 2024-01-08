SetTitleMatchMode, 2 ; 设置标题匹配模式，以便模糊匹配窗口标题

; 查找 Chrome 窗口并将其置于最顶层
WinGet, chromeWindow, ID, Chrome ; 可能需要调整 "Chrome" 以匹配你的 Chrome 窗口标题
WinSet, AlwaysOnTop, On, ahk_id %chromeWindow%

; 最大化 Chrome 窗口
WinMaximize, ahk_id %chromeWindow%

